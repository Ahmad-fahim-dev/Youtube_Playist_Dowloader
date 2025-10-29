# Modern Landing Page Template

A visually captivating, modern landing page template built with Flask. Features stunning glassmorphism design, smooth animations, and fully responsive layout.

## Features

- **Modern Design**: Glassmorphism effects with 3D animations and gradients
- **Dark/Light Mode**: Built-in theme toggle with smooth transitions
- **Mobile-First**: Fully responsive design that works on all devices
- **Fast Loading**: Optimized for performance and SEO
- **Customizable**: Easy-to-edit sections for any business or product
- **Email Collection**: Built-in email signup functionality
- **Animations**: Smooth scrolling, particle effects, and interactive elements

## Tech Stack

- **Backend**: Python 3.x, Flask
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **UI Framework**: Custom glassmorphism design system
- **Fonts**: Poppins (Google Fonts)
- **Icons**: Font Awesome 6

## Included Sections

- Hero section with compelling headline and CTA
- Value proposition with feature cards
- How it works step-by-step guide
- Customer testimonials
- Final call-to-action
- Comprehensive footer

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd modern-landing-page
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. Run the Flask application:
   ```bash
   python app.py
   ```

2. Open your browser and go to:
   ```
   http://localhost:5000
   ```

## Customization

The template is designed to be easily customizable. Replace the placeholders in square brackets `[ ]` with your content:

- Company/brand name
- Product/service name
- Headlines and descriptions
- Feature descriptions
- Testimonials from real customers
- Social media links
- Contact information

### Key Files to Edit:
- `templates/index.html`: Main template with all content
- `static/style.css`: Modern styling with customizable colors
- `app.py`: Backend logic for email collection

## Endpoints

- `GET /`: Serves the main landing page
- `POST /submit_email`: Handles email signup submissions

## Project Structure

```
modern-landing-page/
│
├── app.py                    # Flask application
├── requirements.txt          # Python dependencies
├── README.md                # This documentation
├── templates/
│   └── index.html           # Main landing page template
└── static/
    └── style.css            # Styling with animations
```

## SEO Optimization

- Semantic HTML structure
- Proper meta tags
- Fast loading design
- Mobile-friendly responsive layout
- Clean URL structure

## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This template is available for personal and commercial use. Please keep the footer credits intact when using for client projects.

## Support

For customization help or questions, refer to the code comments or modify CSS variables for branding.
