const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const defaultData = {
      users: [
        {
          id: 'u1',
          name: 'Obinna C.',
          username: 'obinna',
          bio: 'Building creative products and sharing ideas with the world.',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
        },
        {
          id: 'u2',
          name: 'Ada King',
          username: 'adaking',
          bio: 'Tech writer, keynote speaker, and coffee enthusiast.',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
        },
        {
          id: 'u3',
          name: 'Sam Reed',
          username: 'samreed',
          bio: 'Frontend engineer building delightful digital experiences.',
          avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80'
        }
      ],
      posts: [
        {
          id: 'p1',
          author: 'Obinna C.',
          username: 'obinna',
          content: 'Shipping our new community platform today. The goal is simple: better conversations and faster ideas.',
          image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
          likes: 128,
          comments: [
            { id: 'c1', author: 'Ada King', text: 'This is a great vision for a community-first product.' },
            { id: 'c2', author: 'Sam Reed', text: 'Love the direction. The product feels clean already.' }
          ],
          createdAt: '2026-11-07T12:40:00.000Z'
        },
        {
          id: 'p2',
          author: 'Ada King',
          username: 'adaking',
          content: 'Idea for the week: create a product that helps teams share updates without meetings. Momentum beats meetings.',
          image: '',
          likes: 98,
          comments: [
            { id: 'c3', author: 'Obinna C.', text: 'Absolutely, async communication is the future.' }
          ],
          createdAt: '2026-11-07T11:20:00.000Z'
        },
        {
          id: 'p3',
          author: 'Sam Reed',
          username: 'samreed',
          content: 'Design systems are not just style guides. They are the product language that helps teams move faster.',
          image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
          likes: 74,
          comments: [],
          createdAt: '2026-11-07T09:35:00.000Z'
        }
      ]
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
  }
}

function readData() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SocialMedia app backend is running.' });
});

app.get('/api/users', (req, res) => {
  const data = readData();
  res.json(data.users);
});

app.post('/api/users', (req, res) => {
  const { name, username, bio, avatar } = req.body || {};

  if (!name || !username) {
    return res.status(400).json({ error: 'Name and username are required.' });
  }

  const data = readData();
  const exists = data.users.some((user) => user.username.toLowerCase() === username.toLowerCase());

  if (exists) {
    return res.status(409).json({ error: 'Username already exists.' });
  }

  const user = {
    id: randomUUID(),
    name,
    username,
    bio: bio || 'New member of the community.',
    avatar: avatar || 'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=200&q=80'
  };

  data.users.unshift(user);
  saveData(data);

  res.status(201).json(user);
});

app.get('/api/posts', (req, res) => {
  const data = readData();
  const sorted = [...data.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

app.post('/api/posts', (req, res) => {
  const { author, username, content, image } = req.body || {};

  if (!author || !content) {
    return res.status(400).json({ error: 'Author and content are required.' });
  }

  const data = readData();
  const post = {
    id: randomUUID(),
    author,
    username: username || author.toLowerCase().replace(/\s+/g, ''),
    content,
    image: image || '',
    likes: 0,
    comments: [],
    createdAt: new Date().toISOString()
  };

  data.posts.unshift(post);
  saveData(data);

  res.status(201).json(post);
});

app.post('/api/posts/:id/like', (req, res) => {
  const { id } = req.params;
  const data = readData();
  const post = data.posts.find((item) => item.id === id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  post.likes += 1;
  saveData(data);

  res.json(post);
});

app.post('/api/posts/:id/comments', (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body || {};

  if (!author || !text) {
    return res.status(400).json({ error: 'Author and comment text are required.' });
  }

  const data = readData();
  const post = data.posts.find((item) => item.id === id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  const comment = {
    id: randomUUID(),
    author,
    text
  };

  post.comments.push(comment);
  saveData(data);

  res.status(201).json(comment);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SocialMedia app is running on http://localhost:${PORT}`);
});
