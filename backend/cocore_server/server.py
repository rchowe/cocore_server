import json
import os
import time
import tornado.ioloop
import tornado.web
import tornado.websocket
import uuid

STATIC_FILES_DIR = os.path.join(os.path.dirname(__file__), 'static')

connected_vms = {}
connected_web_clients = {}

class VMHandler (tornado.websocket.WebSocketHandler):
    """
    A class to handle web socket connections from VMs.
    """

    id = None
    tasks = None

    def check_origin(self, origin):
        return True

    def open(self):
        print(f'[      ] Worker {self.request.remote_ip} joined.')

    def on_message(self, message):
        payload = json.loads(message)
        action = payload.get('action', None)
        if action == 'connect':
            self.id = payload['id']
            self.tasks = []
            self.status = 'online'
            connected_vms[self.id] = self

            print(f'[{self.id[:6]}] Worker {self.request.remote_ip} joined.')

            for client in connected_web_clients.values():
                client.send_vm_list()
        
        if action == 'task_log':
            if not self.id:
                print('Attempted to update task without initializing')
                return
            
            task_id = payload['taskId']
            matching_tasks = [t for t in connected_vms[self.id].tasks if t['id'] == task_id]
            if not matching_tasks:
                print('No matching tasks for ID')
                return
            
            task = matching_tasks[0]
            if 'stdout' not in task:
                task['stdout'] = ''
            if 'stderr' not in task:
                task['stderr'] = ''
            task['stdout'] += payload.get('stdout', '')
            task['stderr'] += payload.get('stderr', '')
            task['status'] = payload.get('status', task['status'])

            for client in connected_web_clients.values():
                try:
                    client.send_vm_list()
                except tornado.websocket.WebSocketClosedError:
                    pass

    def on_close(self):
        print(f'[{self.id[:6]}] Worker {self.request.remote_ip} disconnected.')
        connected_vms[self.id].status = 'offline'

        for client in connected_web_clients.values():
            client.send_vm_list()

class WebClientHandler (tornado.websocket.WebSocketHandler):
    """
    List VMs for the web client.
    """
    
    id = None

    def check_origin(self, origin):
        return True

    def open(self):
        self.id = str(uuid.uuid4())
        print(f'[{self.id[:6]}] Web client {self.request.remote_ip} joined.')
        connected_web_clients[self.id] = self
        self.send_vm_list()
    
    def on_message(self, message):
        payload = json.loads(message)
        task_id = payload.get('taskId', str(uuid.uuid4()))
        worker_id = payload.get('workerId', None)
        task_type = payload.get('type', 'shell')
        task_command = payload.get('command', None)
        
        if not worker_id:
            print('No worker ID in task start message')
            return
        
        if worker_id not in connected_vms:
            print('No VM found for worker ID')
            return
        
        task = {
            'id': task_id,
            'workerId': worker_id,
            'type': task_type,
            'command': task_command,
            'status': 'open',
        }

        connected_vms[worker_id].write_message(json.dumps(task))
        connected_vms[worker_id].tasks += [task]

        for client in connected_web_clients.values():
            try:
                client.send_vm_list()
            except tornado.websocket.WebSocketClosedError:
                pass

    def on_close(self):
        print(f'[{self.id[:6]}] Web client {self.request.remote_ip} disconnected.')
        del connected_web_clients[self.id]
    
    def send_vm_list(self):
        message = [
            {
                'id': conn.id,
                'ipAddress': conn.request.remote_ip,
                'status': conn.status,
                'tasks': conn.tasks,
            }
            for (ident, conn)
            in connected_vms.items()
        ]
        self.write_message(json.dumps(message))

application = tornado.web.Application([
    (r'/vm', VMHandler),
    (r'/webclient', WebClientHandler),
])

def start_server():
    print('Starting server on http://*:3001')
    application.listen(3001)
    tornado.ioloop.IOLoop.instance().start()

if __name__ == '__main__':
    start_server()
