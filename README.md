# FlashMaster: Advanced Spaced Repetition Flashcards

A powerful spaced repetition flashcard application built with React and TypeScript to optimize your learning experience. FlashMaster implements the scientifically-proven SM-2 algorithm to help you memorize information more efficiently and retain it longer.

![FlashMaster Screenshot](screenshot.jpg)

## 🚀 Features

### Core Features
- **Advanced Spaced Repetition Algorithm**: SM-2 algorithm implementation for optimal learning efficiency
- **Interactive Flashcards**: Flip cards, rate your confidence, and track your progress
- **Comprehensive Dashboard**: Visualize your learning progress with detailed statistics
- **Multiple Card Types**: Support for basic, cloze deletion, and rich media cards
- **Customizable Decks**: Organize your cards into decks with hierarchical structure

### Advanced Features
- **Knowledge Graph**: Connect related concepts to build a comprehensive knowledge network
- **Adaptive Learning**: Algorithm adjusts to your personal learning patterns
- **Study Optimization**: Focused mode, interleaving practice, and optimal scheduling
- **Achievements System**: Gamified learning experience with achievements and milestones
- **Offline Support**: Full functionality even without internet connection
- **Cross-Device Sync**: Optional cloud synchronization for multi-device use

## ✨ Visual Design & UI Experience

FlashMaster features a modern, polished interface designed to enhance your learning experience:

- **Elegant Card Designs**: Beautiful card animations with smooth 3D flipping effects and subtle hover states
- **Sophisticated Color System**: Carefully selected color palettes with gradients and depth
- **Animated Interactions**: Polished micro-interactions and transitions throughout the app
- **Visual Feedback**: Intuitive visual cues for learning progress and achievements
- **Consistent Design Language**: Cohesive styling across all components for a premium look and feel
- **Responsive Layout**: Optimized for all devices from desktop to mobile
- **Dynamic Knowledge Graph**: Interactive visualization of your knowledge connections
- **Accessibility Focused**: High contrast options and keyboard navigation support

The UI is optimized not just for aesthetics but for the learning psychology behind effective flashcard study, creating an environment that encourages focus and retention.

## 📊 Technical Implementation

### Architecture
- **Frontend**: React with TypeScript for type safety and maintainability
- **State Management**: Context API for efficient application state management
- **Storage**: IndexedDB via Dexie.js for local-first approach with robust data persistence
- **Styling**: Custom CSS with CSS variables for consistent theming and dark mode support
- **Animations**: CSS transitions and animations for smooth interactions

### Algorithm Implementation
The application implements the SuperMemo SM-2 algorithm with enhancements:
- Optimized interval calculations: `I(n+1) = I(n) * EF`
- Dynamic ease factor adjustment: `EF' = EF + (0.1 - (5 - q) * 0.08 + (5 - q) * 0.02)`
- Adaptive learning stages (learning, review, relearning)
- Overdue card handling with partial interval reset

## 🌐 Live Demo

[Click here to try FlashMaster online!](https://your-live-demo-url.vercel.app)

_Replace the above link with your actual deployed URL before submission._

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```
git clone https://github.com/Abhijeetofanjayrough/spaced-repetition-flashcards.git
cd spaced-repetition-flashcards
```

2. Install dependencies:
```
npm install
```

3. Start the development server:
```
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### 🚢 Deployment

#### Deploy to Vercel (Recommended)
1. [Sign up for Vercel](https://vercel.com/) if you haven't already.
2. Click 'New Project' and import your GitHub repo: `Abhijeetofanjayrough/spaced-repetition-flashcards`.
3. Follow the prompts and deploy. Your app will be live at `https://your-project-name.vercel.app`.

#### Deploy to Netlify
1. [Sign up for Netlify](https://netlify.com/) if you haven't already.
2. Click 'Add new site' > 'Import an existing project'.
3. Connect your GitHub repo and deploy.

## 📝 Usage Guide

### Creating Flashcards
1. Navigate to the dashboard and click "Create Deck" to create a new deck
2. Select your deck and click "Add Card" to create flashcards
3. Enter front and back content using the rich text editor
4. Add tags, attachments, or connect to related cards as needed
5. Save your card to add it to the deck

### Studying Flashcards
1. From the dashboard, select a deck to study or choose "Random Mix"
2. View the front of the card and try to recall the answer
3. Flip the card to check your answer
4. Rate your confidence from 1-5 to help the algorithm schedule your next review
5. Continue through your study session until complete

### Tracking Progress
1. Visit the dashboard to see your current learning stats
2. Check the "Weekly Forecast" to plan your study sessions
3. Visit the "Analytics" section for in-depth performance metrics
4. Track your achievements and streaks for motivation

## 📱 Mobile Responsiveness

FlashMaster is fully responsive and optimized for both desktop and mobile use:
- Fluid layouts that adapt to any screen size
- Touch-optimized interfaces for card flipping and rating
- Offline capability for studying on the go

## 🎨 Customization

### Themes
- Light and dark mode support with automatic detection of system preferences
- Customizable color schemes through CSS variables

### Preferences
- Adjustable study session sizes and card ordering
- Customizable scheduling parameters
- Interface layout options

## 📈 Future Roadmap

- Collaborative decks and social sharing features
- AI-assisted card generation from text and notes
- Voice recognition for hands-free studying
- Expanded analytics with machine learning insights

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- SuperMemo for the original SM-2 algorithm research
- React and TypeScript teams for the excellent developer experience
- All contributors and users for their feedback and support
