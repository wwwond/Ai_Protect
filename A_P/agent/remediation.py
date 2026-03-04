from actions.firewall import block_ip, unblock_ip, block_port, unblock_port
from actions.edr import quarantine_host, release_isolation

def handle_block_ip(ip: str) -> dict:
    success = block_ip(ip)
    return {"result": "success" if success else "fail", "action": "block_ip", "ip": ip}

def handle_unblock_ip(ip: str) -> dict:
    success = unblock_ip(ip)
    return {"result": "success" if success else "fail", "action": "unblock_ip", "ip": ip}

def handle_block_port(port: int) -> dict:
    success = block_port(port)
    return {"result": "success" if success else "fail", "action": "block_port", "port": port}

def handle_unblock_port(port: int) -> dict:
    success = unblock_port(port)
    return {"result": "success" if success else "fail", "action": "unblock_port", "port": port}

def handle_quarantine_host(hostname: str = None) -> dict:
    success = quarantine_host(hostname)
    return {"result": "success" if success else "fail", "action": "isolate_host", "host": hostname}

def handle_release_isolation(hostname: str = None) -> dict:
    success = release_isolation(hostname)
    return {"result": "success" if success else "fail", "action": "release_isolation", "host": hostname}