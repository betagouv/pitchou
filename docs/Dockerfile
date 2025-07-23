FROM ruby:3.3

# Installer les dépendances système nécessaires
RUN apt-get update -qq && \
    apt-get install -y build-essential libpq-dev nodejs

WORKDIR /srv/jekyll

# Copier le Gemfile et Gemfile.lock
COPY Gemfile* ./

# Installer les dépendances Ruby (github-pages)
RUN bundle install

# Copier le reste du site
COPY . .

EXPOSE 4000

CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0"]