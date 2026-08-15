# Размещение сайта УМКА на VPS

Домен: **умка.москва**  
Punycode (DNS / SSL): **xn--80atf1a.xn--80adxhks**  
IP сервера: **91.240.85.2**

Сайт статический: Docker-контейнер с nginx раздаёт HTML/CSS/JS.

---

## 1. DNS

У регистратора домена создайте **A-запись**:

| Имя / хост | Тип | Значение     |
|------------|-----|--------------|
| `@` или `умка.москва` | A | `91.240.85.2` |

При необходимости укажите Punycode-имя `xn--80atf1a.xn--80adxhks` — это тот же домен.

Проверка (с вашего ПК или сервера):

```bash
nslookup xn--80atf1a.xn--80adxhks
# или
dig +short A xn--80atf1a.xn--80adxhks
```

Должен вернуться `91.240.85.2`. Подождите распространения DNS (от минут до нескольких часов).

---

## 2. Подготовка VPS

Подключитесь по SSH:

```bash
ssh root@91.240.85.2
```

Установите Docker (Ubuntu/Debian):

```bash
apt update
apt install -y ca-certificates curl
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

Откройте порт **84** в firewall (пример для ufw):

```bash
ufw allow OpenSSH
ufw allow 84/tcp
ufw enable
```

HTTP сайта слушает хостовый порт **84** (внутри контейнера по-прежнему 80). Порты 80 и 443 на хосте заняты системным nginx — Docker их не занимает.

---

## 3. Загрузка проекта

Пример через git:

```bash
cd /opt
git clone <URL-репозитория> umka
cd umka
```

Или через `scp` с вашего компьютера:

```bash
scp -r c:\Users\Admin\Desktop\siteartem root@91.240.85.2:/opt/umka
```

На сервере:

```bash
cd /opt/umka
mkdir -p certbot/conf certbot/www
```

---

## 4. Первый запуск (HTTP)

Стартовый конфиг [`nginx/default.conf`](nginx/default.conf) отдаёт сайт по HTTP и путь для Let's Encrypt. SSL-файл пока отключён (`.disabled`), чтобы nginx не падал без сертификатов.

```bash
docker compose up -d --build
```

Проверьте:

- по IP: `http://91.240.85.2:84`
- по домену: `http://умка.москва:84`

---

## 5. Получение SSL (Let's Encrypt)

Сейчас контейнер слушает только порт **84**. Порты 80/443 заняты хостовым nginx, поэтому HTTPS удобнее делать через **прокси на хосте**:

1. Хостовый nginx принимает `умка.москва` на 80/443.
2. Проксирует на `http://127.0.0.1:84`.
3. Сертификат выдаёте certbot’ом на хосте (`certbot --nginx` или webroot).

Пример server-блока на хосте (после получения сертификата пути подставит certbot):

```nginx
server {
    listen 80;
    server_name умка.москва xn--80atf1a.xn--80adxhks;

    location / {
        proxy_pass http://127.0.0.1:84;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Альтернатива без хостового nginx: временно освободить 80/443, вернуть в `docker-compose.yml` порты `"80:80"` и `"443:443"`, и следовать схеме certbot из контейнера (как раньше).

Опционально — certbot внутри Docker (нужен свободный порт 80):

```bash
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email YOUR_EMAIL@example.com \
  --agree-tos \
  --no-eff-email \
  -d xn--80atf1a.xn--80adxhks \
  -d умка.москва
```

Сертификаты появятся в:

`certbot/conf/live/xn--80atf1a.xn--80adxhks/`

---

## 6. Включение HTTPS (через хостовый nginx)

SSL на хосте (рекомендуется при занятых 80/443):

```bash
# после добавления server-блока с proxy_pass на 127.0.0.1:84
certbot --nginx -d xn--80atf1a.xn--80adxhks -d умка.москва
nginx -t && systemctl reload nginx
```

Проверка: `https://умка.москва` (без `:84` — трафик идёт через хостовый nginx на 443).

Включать `default-ssl.conf` внутри Docker-контейнера не нужно, пока 443 не проброшен в контейнер.

---

## 7. Автопродление сертификата

Если сертификат выдан хостовым certbot:

```cron
0 3 * * 1 certbot renew --quiet && systemctl reload nginx
```

Если использовали certbot в Docker (порты 80/443 у контейнера):

```cron
0 3 * * 1 cd /opt/umka && docker compose run --rm certbot renew && docker compose exec web nginx -s reload
```

Ручное продление (хост):

```bash
certbot renew
systemctl reload nginx
```

---

## 8. Обновление сайта

После правок HTML/CSS/JS/картинок:

```bash
cd /opt/umka
# залить новые файлы (git pull / scp)
docker compose up -d --build
```

Конфиг nginx и сертификаты сохраняются в томах/`nginx/` и `certbot/` — пересборка их не затирает.

---

## Полезные команды

```bash
docker compose ps
docker compose logs -f web
docker compose down          # остановить
docker compose up -d --build # запустить / пересобрать
```

## Если ошибка: `address already in use`

Сейчас в compose только порт **84**. Проверка:

```bash
ss -tlnp | grep ':84'
```

Если 84 тоже занят — смените левую часть в `docker-compose.yml` (`"XXXX:80"`) на свободный порт.

---

## Локальная проверка (без SSL)

На своём ПК:

```bash
docker compose up --build
```

Откройте `http://localhost:84`. HTTPS настраивается только на VPS с валидным DNS.
