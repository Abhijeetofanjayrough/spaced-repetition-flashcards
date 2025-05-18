#!/bin/bash

# Spaced Repetition Flashcards Deployment Script

echo "Starting deployment process..."

# Build the React app
echo "Building React application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Build failed! Aborting deployment."
  exit 1
fi

# Create a timestamp for the deployment folder
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEPLOY_FOLDER="deployment_$TIMESTAMP"

# Create deployment folder
echo "Creating deployment folder: $DEPLOY_FOLDER"
mkdir -p $DEPLOY_FOLDER

# Copy build files to deployment folder
echo "Copying build files to deployment folder..."
cp -R build/* $DEPLOY_FOLDER/

# Create a simple deployment info file
echo "Creating deployment info file..."
cat > $DEPLOY_FOLDER/deployment_info.txt << EOL
Spaced Repetition Flashcards App
Deployment date: $(date)
Version: $(grep -m1 "version" package.json | cut -d'"' -f4)
EOL

echo "Preparing for deployment to hosting service..."
# Add hosting-specific commands here, e.g., for GitHub Pages:
# git checkout gh-pages
# cp -R $DEPLOY_FOLDER/* .
# git add .
# git commit -m "Deploy: $TIMESTAMP"
# git push origin gh-pages

echo "Deployment preparation complete: $DEPLOY_FOLDER"
echo "To manually deploy, upload the contents of the $DEPLOY_FOLDER directory to your web server."

# Instructions for GitHub Pages (if used)
echo ""
echo "For GitHub Pages deployment:"
echo "1. Create a gh-pages branch if it doesn't exist:"
echo "   git checkout -b gh-pages"
echo ""
echo "2. Copy build files:"
echo "   cp -R $DEPLOY_FOLDER/* ."
echo ""
echo "3. Commit and push:"
echo "   git add ."
echo "   git commit -m \"Deploy: $TIMESTAMP\""
echo "   git push origin gh-pages"
echo ""
echo "4. Return to main branch:"
echo "   git checkout main" 