import onChange from 'on-change';

export default (state, elements, i18n) => {
  (() => {
    document.querySelector('.full-article').textContent = i18n.t('readFullBtn');
    document.querySelector('.modal-footer [type="button"]').textContent = i18n.t('closeBtn');
    document.querySelector('h1').textContent = i18n.t('header');
    document.querySelector('.lead').textContent = i18n.t('description');
    document.querySelector('#url-input').placeholder = i18n.t('urlLabel').toLowerCase();
    document.querySelector('label[for="url-input"]').textContent = i18n.t('urlLabel');
    document.querySelector('[type="submit"]').textContent = i18n.t('addBtn');
    document.querySelector('.example').textContent = i18n.t('example');
  })();

  const {
    input, feedback, submitButton, containers, modal,
  } = elements;

  const renderError = (textError) => {
    input.classList.add('is-invalid');
    feedback.classList.replace('text-success', 'text-danger');
    feedback.textContent = textError;
  };

  const renderSuccess = (textFeedback = '') => {
    input.classList.remove('is-invalid');
    input.value = '';
    feedback.classList.replace('text-danger', 'text-success');
    feedback.textContent = textFeedback;
    setTimeout(() => input.focus(), 0);
  };

  const createCard = (title) => {
    const cardTitleEl = document.createElement('h2');
    cardTitleEl.classList.add('card-title', 'h4');
    cardTitleEl.append(title);

    const cardBodyEl = document.createElement('div');
    cardBodyEl.classList.add('card-body');
    cardBodyEl.append(cardTitleEl);

    const cardEl = document.createElement('div');
    cardEl.classList.add('card', 'border-0');
    cardEl.append(cardBodyEl);

    return cardEl;
  };

  const renderPosts = (items, readingPosts) => {
    const posts = items.map((item) => {
      const aEl = document.createElement('a');
      aEl.href = item.link;
      aEl.dataset.id = item.id;
      aEl.target = '_blank';
      aEl.rel = 'noopener noreferrer';
      if (readingPosts.includes(item.id)) {
        aEl.classList.add('fw-normal', 'link-secondary');
      } else {
        aEl.classList.add('fw-bold');
      }
      aEl.append(item.title);

      const buttonEl = document.createElement('button');
      buttonEl.classList.add('btn', 'btn-outline-primary', 'btn-sm');
      buttonEl.type = 'button';
      buttonEl.dataset.id = item.id;
      buttonEl.dataset.bsToggle = 'modal';
      buttonEl.dataset.bsTarget = '#modal';
      buttonEl.append(i18n.t('viewing'));

      const liEl = document.createElement('li');
      liEl.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
      liEl.append(aEl, buttonEl);

      return liEl;
    });

    const ulEl = document.createElement('ul');
    ulEl.classList.add('list-group', 'border-0', 'rounded-0');
    ulEl.append(...posts);

    const cardEl = createCard(i18n.t('posts'));
    cardEl.append(ulEl);

    const container = containers.posts;
    container.innerHTML = '';
    container.append(cardEl);
  };

  const renderFeeds = (items) => {
    const feeds = items.map((item) => {
      const h3El = document.createElement('h3');
      h3El.classList.add('h6', 'm-0');
      h3El.append(item.title);

      const pEl = document.createElement('p');
      pEl.classList.add('m-0', 'small', 'text-black-50');
      pEl.append(item.description);

      const liEl = document.createElement('li');
      liEl.classList.add('list-group-item', 'border-0', 'border-end-0');
      liEl.append(h3El, pEl);

      return liEl;
    });

    const ulEl = document.createElement('ul');
    ulEl.classList.add('list-group', 'border-0', 'rounded-0');
    ulEl.append(...feeds);

    const cardEl = createCard(i18n.t('feeds'));
    cardEl.append(ulEl);

    const container = containers.feeds;
    container.innerHTML = '';
    container.append(cardEl);
  };

  const renderModal = (postId, posts) => {
    const post = posts.filter((item) => item.id === postId)[0];
    modal.title.textContent = post.title;
    modal.body.textContent = post.description;
    modal.link.href = post.link;
  };

  const renderReading = (postId) => {
    const aEl = document.querySelector(`a[data-id="${postId}"]`);
    aEl.classList.remove('fw-bold');
    aEl.classList.add('fw-normal', 'link-secondary');
  };

  const handleProcessState = (processState) => {
    switch (processState) {
      case 'sending':
        input.disabled = true;
        submitButton.disabled = true;
        break;

      case 'finished':
        renderSuccess(i18n.t('success'));
        break;

      case 'failed':
        renderError(i18n.t(state.rssForm.error));
        break;

      case 'filling':
        input.disabled = false;
        submitButton.disabled = false;
        break;

      default:
        throw new Error(`Unknown process state: ${processState}`);
    }
  };

  const watchedState = onChange(state, (path, value, previous) => {
    switch (path) {
      case 'rssForm.valid':
        if (value) {
          renderSuccess();
        }
        break;

      case 'rssForm.error':
        if (value.length > 0) {
          renderError(i18n.t(value));
        }
        break;

      case 'rssForm.status':
        handleProcessState(value);
        break;

      case 'posts':
        if (value.length > previous.length) {
          renderPosts(value, state.uiState.readingPosts);
        }
        break;

      case 'feeds':
        if (value.length > previous.length) {
          renderFeeds(value);
        }
        break;

      case 'uiState.currentPost':
        renderModal(value, state.posts);
        renderReading(value);
        break;

      default:
        break;
    }
  });

  return watchedState;
};
