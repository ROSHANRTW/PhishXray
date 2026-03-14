# PhishXray

PhishXray is a web application designed to help users identify and report phishing threats. The application provides a user-friendly interface for scanning emails, links, and websites for potential phishing attacks.

## Project Structure

```
phishxray
├── public
│   ├── index.html
│   └── images
│       └── (profile and other images)
├── src
│   ├── App.js
│   ├── App.css
│   ├── dashboard.js
│   ├── NotFound.js
│   ├── Forbidden.js
│   ├── profile.js
│   ├── components
│   │   └── UserProfile.js
│   └── index.js
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Features

- **User Profile Management**: Users can manage their profiles, including uploading a profile photo and selecting their gender.
- **Phishing Scans**: Users can scan emails, links, and websites for phishing threats.
- **Reports Section**: Users can download reports related to their scans.
- **Responsive Design**: The application is built with Tailwind CSS for a responsive and modern user interface.

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/phishxray.git
   ```
2. Navigate to the project directory:
   ```
   cd phishxray
   ```
3. Install the dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm start
   ```

## Usage

- Open your browser and navigate to `http://localhost:3000` to access the application.
- Use the dashboard to scan for phishing threats and manage your user profile.

## Technologies Used

- React
- Tailwind CSS
- AOS (Animate On Scroll)
- Font Awesome

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.