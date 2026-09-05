# Career Site

Static personal website hosted directly from this repository.

**Live:** <https://rahid.persipico.com>

## Demo

<img src="assets/demo/demo.gif" alt="Demo" width="800" />

Watch in full quality: [`assets/demo/demo.mp4`](assets/demo/demo.mp4) · [`demo.mp4` on GitHub](https://github.com/lianbeast/resume-website/blob/main/assets/demo/demo.mp4?raw=true)

## Autostart with systemd (user)

A systemd user service can serve the site on port **2080** automatically after login.

### Service file
```
[Unit]
Description=Career Site HTTP Server (port 2080)
After=network.target

[Service]
Type=simple
WorkingDirectory=~/Applications/Play-Site/Career-Site
ExecStart=/usr/bin/python3 -m http.server 2080
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```

The file is located at `~/.config/systemd/user/career-site.service`.

### Enable & start
```bash
systemctl --user daemon-reload
systemctl --user enable career-site.service
systemctl --user start career-site.service
```
The service will now start automatically on user login and can be managed with standard `systemctl --user` commands.

### Verify
```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8080/
```
Should return `HTTP 200` indicating the site is being served.
