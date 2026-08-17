FROM nginx:alpine

COPY index.html style.css script.js i18n.js /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
