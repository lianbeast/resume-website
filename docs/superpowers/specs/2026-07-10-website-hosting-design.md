# Website Hosting Design - Local Development

## Goal
To host the static website located in the current directory (`/home/tumbleweed/Applications/Arch/Play-Site/Career-Site`) on port 80 for local development purposes.

## Approved Approach
The Python 3 built-in `http.server` module will be used due to its simplicity and zero external dependencies.

## Implementation Details
The server will be started using the command:
```bash
sudo python3 -m http.server 80
```
- **Port:** The server will listen on port 80.
- **Privileges:** `sudo` is required to bind to port 80 (a privileged port).
- **Process:** The server will run as a foreground process.
- **Stopping the server:** The user will need to manually stop the server by pressing `Ctrl+C` in the terminal where it is running.

## Trade-offs
- **Simplicity:** High, single command.
- **Dependencies:** None, uses built-in Python 3.
- **Persistence:** Not persistent; suitable for local development but not for production.
- **Features:** Basic static file serving; no advanced features like routing, load balancing, or TLS.

## Success Criteria
- The website is accessible via `http://localhost/` in a web browser.
- All static assets (HTML, CSS, images) load correctly.
