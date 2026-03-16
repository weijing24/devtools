FROM nginx:alpine
COPY index.html style.css diff.js app.js json-formatter.js json-viewer.js favicon.svg /usr/share/nginx/html/
EXPOSE 80
