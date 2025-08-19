# 🍬 Candy Crush Cats

A sweet match-3 puzzle game with cute cats and delicious candies! Built for Telegram Web Apps with React and deployed on Railway.

## 🎮 Game Features

- **Match-3 Gameplay**: Swap adjacent candies to create matches of 3 or more
- **5 Candy Types**: Cats 😺, Pretzels 🥨, Strawberries 🍓, Oreos 🍪, Marshmallows 🍡
- **Spectacular Effects**: Particle explosions, smooth animations, cascade combos
- **Touch & Drag**: Intuitive controls for mobile and desktop
- **Telegram Integration**: Native Telegram WebApp with haptic feedback
- **Complete Game Systems**: Shop, leaderboards, daily rewards, settings

## 🚀 Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Pure CSS with custom animations
- **Backend**: Express.js with compression and security
- **Deployment**: Railway with automatic builds
- **Integration**: Telegram WebApp SDK

## 📱 Telegram Bot Setup

1. Create a new bot with [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Set up Web App URL: `https://your-railway-domain.railway.app`
4. Configure bot commands and description

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🚢 Deploy to Railway

1. Fork this repository
2. Connect your GitHub account to Railway
3. Create a new project and link your repo
4. Railway will automatically build and deploy
5. Set up custom domain (optional)

## 🎯 Game Mechanics

- **Swap**: Touch and drag to swap adjacent candies
- **Matches**: Create lines of 3+ identical candies
- **Cascades**: Gravity causes new matches for bonus points
- **Combos**: Chain reactions multiply your score
- **Power-ups**: Use hints, shuffles, and special tools
- **Progression**: Earn coins, complete daily challenges

## 📂 Project Structure

```
candy-crush-cats/
├── public/          # Static assets
├── src/             # React source code
│   ├── App.jsx      # Main game component
│   ├── main.jsx     # React entry point
│   └── index.css    # Global styles
├── server.js        # Express server
├── package.json     # Dependencies
└── railway.toml     # Railway config
```

## 🎨 Customization

- **Candies**: Change `CANDY_SET` array in App.jsx
- **Colors**: Modify CSS variables in the style injection
- **Animations**: Adjust timing in CSS keyframes
- **Grid Size**: Change `ROWS` and `COLS` constants

## 🔧 Environment Variables

No environment variables required for basic deployment. Optional:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (production/development)

## 📄 License

MIT License - feel free to use this project for your own games!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ❤️ for the Telegram gaming community!
