from setuptools import setup, find_packages

setup(
    name='cocore_server',
    version='0.1.0',
    packages=find_packages(),
    include_package_data=True,
    package_data={
        'cocore_server': ['serverconfig.json'],
    },
    install_requires=[
        'tornado',
    ],
    entry_points={
        'console_scripts': [
            'cocore-server=cocore_server.server:start_server',
        ],
    },
)
