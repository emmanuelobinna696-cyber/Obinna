const state = {
  currentUser: null,
  users: [],
  posts: []
};

const profileCard = document.getElementById('profileCard');
const suggestedUsers = document.getElementById('suggestedUsers');
const feed = document.getElementById('feed');
const postForm = document.getElementById('postForm');
const postContent = document.getElementById('postContent');
const postImageUrl = document.getElementById('postImageUrl');
const composerAvatar = document.getElementById('composerAvatar');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function fetchUsers() {
  const response = await fetch('/api/users');
  const users = await response.json();
  state.users = users;

  if (!state.currentUser) {
    state.currentUser = users[0];
  }

  localStorage.setItem('pulse-user', JSON.stringify(state.currentUser));
  renderProfile();
  renderSuggestedUsers();
}

async function fetchPosts() {
  const response = await fetch('/api/posts');
  state.posts = await response.json();
  renderPosts();
}

function renderProfile() {
  if (!state.currentUser) return;

  profileCard.innerHTML = `
    <img src="${state.currentUser.avatar}" class="user-banner" alt="${escapeHtml(state.currentUser.name)} banner" />
    <div class="profile-user">
      <img src="${state.currentUser.avatar}" class="avatar" alt="${escapeHtml(state.currentUser.name)} avatar" />
      <div>
        <div class="profile-name">${escapeHtml(state.currentUser.name)}</div>
        <div class="profile-username">@${escapeHtml(state.currentUser.username)}</div>
      </div>
    </div>
    <p class="profile-bio">${escapeHtml(state.currentUser.bio)}</p>
    <div class="profile-stats">
      <div>
        <span class="stat-value">128</span>
        <span class="stat-label">Posts</span>
      </div>
      <div>
        <span class="stat-value">9.4k</span>
        <span class="stat-label">Followers</span>
      </div>
      <div>
        <span class="stat-value">420</span>
        <span class="stat-label">Following</span>
      </div>
    </div>
  `;

  composerAvatar.src = state.currentUser.avatar;
}

function renderSuggestedUsers() {
  const popularUsers = state.users.slice(0, 3);

  suggestedUsers.innerHTML = popularUsers
    .map(
      (user) => `
        <div class="suggested-user">
          <div class="suggested-user-details">
            <img src="${user.avatar}" class="avatar small" alt="${escapeHtml(user.name)} avatar" />
            <div>
              <div class="profile-name">${escapeHtml(user.name)}</div>
              <div class="profile-username">@${escapeHtml(user.username)}</div>
            </div>
          </div>
          <button class="follow-btn" type="button">Follow</button>
        </div>
      `
    )
    .join('');
}

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function renderPosts() {
  if (!state.posts.length) {
    feed.innerHTML = '<div class="empty-state">No posts yet. Start the conversation.</div>';
    return;
  }

  feed.innerHTML = state.posts
    .map(
      (post) => `
        <article class="post-card">
          <div class="post-header">
            <div class="post-author">
              <img src="${state.users.find((user) => user.username === post.username)?.avatar || 'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=200&q=80'}" class="avatar" alt="${escapeHtml(post.author)}" />
              <div>
                <div class="name">${escapeHtml(post.author)}</div>
                <div class="meta">@${escapeHtml(post.username || 'user')} · ${formatDate(post.createdAt)}</div>
              </div>
            </div>
            <button class="action-btn" type="button">•••</button>
          </div>

          <div class="post-content">${escapeHtml(post.content)}</div>
          ${post.image ? `<img src="${post.image}" class="post-image" alt="Post image" />` : ''}

          <div class="post-actions">
            <button class="action-btn" data-like-id="${post.id}" type="button">❤️ ${post.likes}</button>
            <span class="stat-label">💬 ${post.comments?.length || 0} comments</span>
          </div>

          <div class="comments">
            ${
              post.comments && post.comments.length
                ? post.comments
                    .map(
                      (comment) => `
                        <div class="comment-item">
                          <div class="comment-body">
                            <div class="comment-author">${escapeHtml(comment.author)}</div>
                            <div>${escapeHtml(comment.text)}</div>
                          </div>
                        </div>
                      `
                    )
                    .join('')
                : '<div class="meta">No comments yet. Be the first to reply.</div>'
            }
            <form class="comment-form" data-comment-form="${post.id}">
              <input class="comment-input" name="comment" placeholder="Write a comment..." required />
              <button class="primary-btn" type="submit">Reply</button>
            </form>
          </div>
        </article>
      `
    )
    .join('');

  document.querySelectorAll('[data-like-id]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const id = event.currentTarget.getAttribute('data-like-id');
      await fetch(`/api/posts/${id}/like`, { method: 'POST' });
      fetchPosts();
    });
  });

  document.querySelectorAll('[data-comment-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const postId = form.getAttribute('data-comment-form');
      const input = form.querySelector('input');
      const text = input.value.trim();

      if (!text) return;

      await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: state.currentUser.name,
          text
        })
      });

      input.value = '';
      fetchPosts();
    });
  });
}

postForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const content = postContent.value.trim();
  const image = postImageUrl.value.trim();

  if (!content) {
    return;
  }

  await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      author: state.currentUser.name,
      username: state.currentUser.username,
      content,
      image
    })
  });

  postForm.reset();
  fetchPosts();
});

function initializeApp() {
  const savedUser = localStorage.getItem('pulse-user');
  if (savedUser) {
    try {
      state.currentUser = JSON.parse(savedUser);
    } catch (error) {
      state.currentUser = null;
    }
  }

  fetchUsers();
  fetchPosts();
}

initializeApp();
