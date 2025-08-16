# 🐾 MeowChi Game - Telegram Web App

A fun match-3 cat puzzle game built for Telegram Web Apps.

## 🎮 Features

- **Match-3 Gameplay**: Stack 3 identical cats vertically to score
- **Drag & Drop**: Move cats between columns strategically  
- **Tetris-style Preview**: See the next cat before dropping
- **60-second Timer**: Fast-paced gameplay with bonus time
- **Mobile Optimized**: Perfect for Telegram's mobile experience
- **5 Navigation Tabs**: Play, Tasks, Leaderboard, Bonus, Account

## 🚀 Deployment

### Railway Deployment

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/meowchi-game.git
   git push -u origin main
   ```

2. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect Vite and deploy

3. **Get Deployment URL**
   - Copy your Railway deployment URL
   - Example: `https://meowchi-game-production.up.railway.app`

### Telegram Integration

1. **Create Telegram Bot**
   ```
   Message @BotFather on Telegram:
   /newbot
   Choose a name: MeowChi Game Bot
   Choose username: MeowChiGameBot
   ```

2. **Set Web App**
   ```
   /mybots
   Select your bot
   Bot Settings → Menu Button → Configure Menu Button
   Text: "🎮 Play Game"
   URL: https://your-railway-url.up.railway.app
   ```

3. **Test the Integration**
   - Find your bot on Telegram
   - Tap the menu button
   - Game should open in Telegram Web App

## 🎯 Game Rules

- **Drop cats** using the green buttons
- **Drag cats** between columns to rearrange
- **Match 3 identical cats** vertically to score 1000 points
- **Create combos** for bonus points
- **Manage space** - columns max out at 10 cats
- **Complete tasks** for bonus time and points

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📱 Mobile Optimization

- Touch-friendly drag & drop
- Fixed column heights for mobile screens
- Responsive design for all screen sizes
- Optimized for Telegram's webview

## 🎨 Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Railway** - Deployment platform
- **Telegram Web Apps API** - Platform integration

---

Made with 🐱 for cat lovers everywhere!
