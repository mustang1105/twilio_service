FROM php:8.3-fpm-bookworm

COPY ./docker/php-fpm/php.ini /usr/local/etc/php/php.ini

RUN cd /usr/bin && curl -s http://getcomposer.org/installer | php && ln -s /usr/bin/composer.phar /usr/bin/composer
RUN apt-get update \
    && apt-get install -y \
    git \
    zip \
    unzip \
    vim \
    curl \
    libssl-dev \
    libpq-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libonig-dev \
    default-mysql-client
# RUN docker-php-ext-install pdo_mysql session json zip opcache mbstring
RUN docker-php-ext-install pdo_mysql session zip opcache mbstring

RUN apt-get update \
  && apt-get install -y \
    imagemagick \
    libmagickwand-dev \
  && pecl install imagick \
  && docker-php-ext-enable imagick


ENV TZ Asia/Tokyo
RUN echo "${TZ}" > /etc/timezone \
   && dpkg-reconfigure -f noninteractive tzdata
