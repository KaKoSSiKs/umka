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

Откройте порты **84** (HTTP) и **443** (HTTPS) в firewall (пример для ufw):

```bash
ufw allow OpenSSH
ufw allow 84/tcp
ufw allow 443/tcp
ufw enable
```

HTTP сайта слушает хостовый порт **84** (внутри контейнера по-прежнему 80).

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

Let's Encrypt проверяет домен по **порту 80**. Пока сайт в Docker на порту 84, HTTP-01 через этот контейнер не сработает, если 80 занят хостовым nginx.

Варианты:

- временно остановить хостовый nginx, пробросить `80:80`, получить сертификат, вернуть схему с 84; или
- настроить на хостовом nginx проксирование `/.well-known/acme-challenge/` в контейнер / общий webroot.

Если порт 80 свободен для Docker — в `docker-compose.yml` добавьте `"80:80"` на время выдачи сертификата.

Подставьте свой email:

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

## 6. Включение HTTPS

```bash
cd /opt/umka

# HTTP → редирект на HTTPS
cp nginx/default.redirect.conf.example nginx/default.conf

# Включить SSL-конфиг
mv nginx/default-ssl.conf.disabled nginx/default-ssl.conf

docker compose exec web nginx -t
docker compose exec web nginx -s reload
```

Если `reload` недоступен (контейнер без exec), перезапустите:

```bash
docker compose restart web
```

Проверка: откройте `https://умка.москва`.

---

## 7. Автопродление сертификата

Добавьте cron на сервере (`crontab -e`):

```cron
0 3 * * 1 cd /opt/umka && docker compose run --rm certbot renew && docker compose exec web nginx -s reload
```

Раз в неделю в 03:00 — попытка renew и перезагрузка nginx.

Ручное продление:

```bash
cd /opt/umka
docker compose run --rm certbot renew
docker compose exec web nginx -s reload
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

## Если ошибка: `address already in use` (порт 84 или 443)

Кто занимает порт:

```bash
ss -tlnp | grep -E ':84|:443'
```

HTTP уже настроен на **84**. Если занят и 443 — либо освободите его (`systemctl stop nginx`), либо уберите строку `"443:443"` из `docker-compose.yml` до настройки SSL.

---

## Локальная проверка (без SSL)

На своём ПК:

```bash
docker compose up --build
```

Откройте `http://localhost:84`. HTTPS настраивается только на VPS с валидным DNS.
