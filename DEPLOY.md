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

Откройте порт **8084** в firewall (пример для ufw):

```bash
ufw allow OpenSSH
ufw allow 8084/tcp
ufw enable
```

HTTP сайта слушает хостовый порт **8084** (внутри контейнера по-прежнему 80). Порты 80 и 443 на хосте заняты системным nginx — Docker их не занимает.

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

- по IP: `http://91.240.85.2:8084`
- по домену: `http://умка.москва:8084`

---

## 5. Хостовый nginx (прокси на порт 8084)

Контейнер `umka-web` уже слушает `127.0.0.1:8084`. Системный nginx на 80/443 должен проксировать домен на этот порт.

Готовый файл: [`host-nginx/umka.moscow.conf`](host-nginx/umka.moscow.conf).

### Шаги на VPS

```bash
# 1) Убедитесь, что контейнер работает
docker ps | grep umka-web
curl -I http://127.0.0.1:8084

# 2) Скопируйте конфиг сайта
cp /opt/umka/host-nginx/umka.moscow.conf /etc/nginx/sites-available/umka.moscow

# 3) Включите сайт (Debian/Ubuntu)
ln -sf /etc/nginx/sites-available/umka.moscow /etc/nginx/sites-enabled/umka.moscow

# Если каталога sites-enabled нет (например, CentOS) —
# положите файл в /etc/nginx/conf.d/umka.moscow.conf

# 4) Проверка и перезагрузка
nginx -t
systemctl reload nginx
```

Проверьте HTTP (без порта 8084):

- `http://умка.москва`
- `http://91.240.85.2` — откроется только если этот server стал default; надёжнее проверять по домену.

DNS A-запись `умка.москва` → `91.240.85.2` должна уже указывать на сервер.

---

## 6. HTTPS (certbot на хосте)

Установите certbot, если ещё нет:

```bash
apt install -y certbot python3-certbot-nginx
```

Выпустите сертификат (certbot сам допишет SSL в конфиг nginx):

```bash
certbot --nginx -d xn--80atf1a.xn--80adxhks -d умка.москва
```

Укажите email, согласитесь с условиями. Затем:

```bash
nginx -t && systemctl reload nginx
```

Проверка: `https://умка.москва` (без `:8084`).

Включать `default-ssl.conf` внутри Docker **не нужно** — SSL терминирует хостовый nginx.


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

Сейчас в compose только порт **8084**. Проверка:

```bash
ss -tlnp | grep ':8084'
```

Если 8084 тоже занят — смените левую часть в `docker-compose.yml` (`"XXXX:80"`) на свободный порт.

---

## Локальная проверка (без SSL)

На своём ПК:

```bash
docker compose up --build
```

Откройте `http://localhost:8084`. HTTPS настраивается только на VPS с валидным DNS.
