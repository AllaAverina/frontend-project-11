import i18next from 'i18next';
import * as yup from 'yup';
import axios from 'axios';
import resources from './locales/index.js';
import watch from './view.js';

const getProxyUrl = (url) => `https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`;

const getParser = () => new DOMParser();

const parse = (data, parser, format) => parser.parseFromString(data, format);

const parseFeed = (document) => {
  const channel = document.querySelector('channel');
  const feed = [...channel.children]
    .filter((child) => child.tagName !== 'item')
    .reduce((acc, { tagName, textContent }) => ({ ...acc, [tagName]: textContent }), {});
  return feed;
};

const parsePosts = (document, idStart) => {
  const items = document.querySelectorAll('item');
  let id = idStart;

  const posts = [...items].map((item) => {
    const post = [...item.children]
      .reduce((acc, { tagName, textContent }) => ({ ...acc, [tagName]: textContent }), {});
    post.id = id;
    id += 1;
    return post;
  });

  return posts;
};

export default async () => {
  const state = {
    rssForm: {
      status: 'filling',
      valid: true,
      error: '',
    },
    urls: [],
    posts: [],
    feeds: [],
    timerId: 0,
    uiState: {
      readingPosts: [],
      currentPost: null,
    },
  };

  const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('#url-input'),
    feedback: document.querySelector('.feedback'),
    submitButton: document.querySelector('button[type="submit"]'),
    containers: {
      posts: document.querySelector('.posts'),
      feeds: document.querySelector('.feeds'),
    },
    modal: {
      title: document.querySelector('.modal-title'),
      body: document.querySelector('.modal-body'),
      link: document.querySelector('.full-article'),
    },
  };

  const i18n = i18next.createInstance();
  await i18n.init({ lng: 'ru', debug: false, resources });

  const watchedState = watch(state, elements, i18n);

  yup.setLocale({
    mixed: {
      notOneOf: () => 'errors.validation.notOneOf',
    },
    string: {
      url: () => 'errors.validation.url',
      nonNullable: () => 'errors.validation.nonNullable',
    },
  });

  const validate = async (url, urls) => {
    const urlSchema = yup.string().nonNullable().url().notOneOf(urls);
    const error = urlSchema.validate(url, { abortEarly: false })
      .then(() => '')
      .catch((e) => e.inner[0].message);
    return error;
  };

  const send = async (url) => (
    axios.get(getProxyUrl(url))
      .then((response) => {
        if (response.status === 200) {
          return response.data;
        }
        throw new Error('NETWORK_ERROR');
      })
      .then((data) => {
        const parser = getParser();
        const parsed = parse(data.contents, parser, 'application/xml');
        return parsed.documentElement;
      })
  );

  const setTimer = () => {
    if (watchedState.timerId) {
      clearTimeout(watchedState.timerId);
    }

    watchedState.timerId = setTimeout(function handle() {
      watchedState.urls.forEach((url) => send(url).then((document) => {
        const posts = parsePosts(document, watchedState.posts.length);
        posts.forEach((post) => {
          const contains = watchedState.posts.some((el) => el.guid === post.guid);
          if (!contains) {
            watchedState.posts = [post, ...watchedState.posts];
          }
        });
      }));
      watchedState.timerId = setTimeout(handle, 5000);
    }, 5000);
  };

  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = elements.input.value;
    const error = await validate(url, watchedState.urls);
    watchedState.rssForm.error = error;
    watchedState.rssForm.valid = (error === '');

    if (watchedState.rssForm.valid) {
      watchedState.rssForm.status = 'sending';

      send(url)
        .then((document) => {
          const parserError = document.querySelector('parsererror');
          if (parserError) {
            throw new Error('EMPTY_RESOURCE');
          }

          const feed = parseFeed(document);
          const posts = parsePosts(document, watchedState.posts.length);

          watchedState.feeds = [feed, ...watchedState.feeds];
          watchedState.posts = [...posts, ...watchedState.posts];
          watchedState.urls.push(url);
          watchedState.rssForm.status = 'finished';

          setTimer();
        })
        .catch((err) => {
          if (err.message === 'EMPTY_RESOURCE') {
            watchedState.rssForm.error = 'errors.noResource';
          } else {
            watchedState.rssForm.error = 'errors.network';
          }
          watchedState.rssForm.status = 'failed';
        })
        .finally(() => {
          watchedState.rssForm.status = 'filling';
        });
    }
  });

  elements.containers.posts.addEventListener('click', (e) => {
    const el = e.target.closest('button[data-id]');
    if (el) {
      const postId = +el.dataset.id;
      watchedState.uiState.currentPost = postId;
      watchedState.uiState.readingPosts.push(postId);
    }
  });
};
