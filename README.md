# Spaced Repetition Flashcards

A powerful, science-based flashcard application leveraging spaced repetition algorithms to optimize learning and retention.

![Screenshot of the application](public/screenshot1.png)

## Features

- **Scientific Learning Algorithm**: Built on the proven SM-2 spaced repetition algorithm for optimal memory retention
- **Adaptive Learning**: Personalizes your study experience based on performance data
- **Flexible Card Types**: Basic, cloze deletion, and multiple-choice formats
- **Rich Content**: Support for text formatting, images, code blocks, and LaTeX equations
- **Knowledge Graph**: Visualize connections between topics and track mastery
- **Performance Analytics**: Detailed insights into your learning progress
- **Interleaving Practice**: Mix related topics for enhanced learning differentiation
- **Offline Support**: Full offline functionality with IndexedDB storage
- **Cross-Platform**: Works on desktop and mobile devices
- **Import/Export**: Easy backup and transfer of your study materials

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/spaced-repetition-flashcards.git

# Navigate to the project directory
cd spaced-repetition-flashcards

# Install dependencies
npm install

# Start the development server
npm start
```

### Creating Your First Deck

1. Navigate to the dashboard
2. Click "Create New Deck"
3. Enter a name and description
4. Start adding cards to your deck

### Studying

1. From the dashboard, choose a deck
2. Click "Study" to begin a study session
3. Review cards and rate your recall (Again, Hard, Good, or Easy)
4. The algorithm will automatically schedule reviews based on your performance

## Technical Implementation

- Built with React and TypeScript
- IndexedDB (via Dexie.js) for local-first data storage
- Service Worker for offline functionality
- Responsive design for all device sizes
- Optimized for performance with large collections of cards

## Deployment

### Manual Deployment
Use the included deploy script to build and prepare the app for deployment:

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deploy script
./deploy.sh
```

### GitHub Pages Deployment
This repository is set up with GitHub Actions for automatic deployment to GitHub Pages:

1. Push your changes to the main branch
2. GitHub Actions will automatically build and deploy to GitHub Pages
3. Your app will be available at https://[your-username].github.io/spaced-repetition-flashcards/

To set up GitHub Pages:
1. Go to your repository settings
2. Navigate to "Pages" in the sidebar
3. Select "GitHub Actions" as the source
4. Your site will deploy on the next push to main branch

## Contributing

Contributions are welcome! If you'd like to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Based on the SuperMemo SM-2 algorithm research by Piotr Wozniak
- Inspired by learning science research on spaced repetition, interleaving, and retrieval practice
