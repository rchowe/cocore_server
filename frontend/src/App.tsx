import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';

interface Task {
  id: string;
  workerId: string;
  type: 'shell';
  command: string;
  status?: string;
}

interface WorkerVM {
  id: string;
  ipAddress: string;
  status: string;
  tasks: Task[];
}

function App() {
  const [workers, setWorkers] = useState<WorkerVM[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [command, setCommand] = useState('');

  const sendDataRef = useRef<((data: string) => void) | null>(null);

  const onSendTaskClick = useCallback((id: string) => {
    setTaskId(id);
    setShowModal(true);
  }, []);

  const onCommitTaskClick = useCallback(() => {
    if (sendDataRef.current) {
      sendDataRef.current(JSON.stringify({
        workerId: taskId,
        type: 'shell',
        command,
      }));
    }

    setShowModal(false);
    setCommand('');
    setTaskId(null);
  }, [command, taskId]);

  useEffect(() => {
    const websocket = new WebSocket('ws://157.230.181.81:3001/webclient');
    websocket.onmessage = (message) => {
	console.log('message', message);
      setWorkers(JSON.parse(message.data));
    };
    
    sendDataRef.current = (message: string) => websocket.send(message);

    return () => {
      sendDataRef.current = null;
      websocket.close();
    };
  }, []);

  return (
    <div className="App">
      <div className="navbar navbar-expand-lg bg-light mb-4">
        <div className="container">
          <div className="navbar-brand">CoCore</div>
        </div>
      </div>

      <div className="content">
        <div className="container">
          <h2>Active Workers</h2>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Tasks</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>

            <tbody>
              {workers?.map((w) => (
                <tr key={w.id}>
                  <td><code>{w.id}</code></td>
                  <td><code>{w.ipAddress}</code></td>
                  <td>{w.status === 'online' ? <span className="badge text-bg-success">ONLINE</span> : <span className="badge text-bg-danger">OFFLINE</span>}</td>
                  <td>{w.tasks.length} Tasks</td>
                  <td className="p-1">
                    <button type="button" className="btn btn-block w-100 btn-secondary btn-sm" onClick={() => onSendTaskClick(w.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        id="start-task-modal"
        className="modal modal-lg"
        tabIndex={-1}
        role="dialog"
        style={{ display: showModal ? 'block' : 'none' }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">Worker {taskId}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" onClick={() => setShowModal(false)} />
            </div>
            <div className="modal-body">

              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Command</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workers?.find((w) => w.id === taskId)?.tasks?.map((task) => (
		    <React.Fragment key={task.id}>
                    <tr>
                      <td><code>{task.id?.substring(0, 8)}</code></td>
                      <td>{task.type}</td>
                      <td><code>{task.command}</code></td>
                      <td><span className="badge text-bg-dark">{task.status}</span></td>
                    </tr>
		    {task.stdout && (
			<tr>
				<td colSpan={4}>
					<pre style={{ width: 760, overflowX: 'scroll' }}>{task.stdout}</pre>
				</td>
			</tr>
		    )}
		    </React.Fragment>
                  ))}
                </tbody>
              </table>

              <hr />

              <div className="form-group">
                <label className="mb-1">Shell Command</label>
                <input type="text" className="form-control" value={command} onChange={(e) => setCommand(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={() => setShowModal(false)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={onCommitTaskClick}>Send Task</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App;
