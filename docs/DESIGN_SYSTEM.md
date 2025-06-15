# Bocker Design System

## Overview
This document defines the design system for Bocker, a B2B SaaS platform for beauty salon management. Our design philosophy emphasizes trust, professionalism, and ease of use.

## Design Principles

### 1. **Trust & Reliability**
- Clean, professional aesthetics that convey enterprise-grade quality
- Consistent visual language across all touchpoints
- Clear hierarchy and information architecture

### 2. **Accessibility First**
- WCAG 2.1 AA compliance
- High contrast ratios for text readability
- Keyboard navigation support
- Screen reader optimized

### 3. **Performance Oriented**
- Lightweight components
- Optimized animations
- Fast loading times (First Contentful Paint < 1.5s)

## Color System

### Primary Colors
```css
/* Primary - Teal/Cyan for main actions */
--primary: oklch(0.25 0.020 231.99);
--primary-foreground: oklch(0.985 0.001 106.423);

/* Button - Action-oriented teal */
--button: oklch(0.46 0.0846 175.9);
--button-foreground: oklch(1 0 none);
```

### Semantic Colors
```css
/* Success - Green for positive actions */
--success: oklch(0.65 0.150 142.55);
--success-foreground: oklch(0.98 0.020 142.55);

/* Warning - Yellow for caution */
--warning: oklch(0.98 0.025 65.0);
--warning-foreground: oklch(0.65 0.150 65.0);

/* Destructive - Red for dangerous actions */
--destructive: oklch(0.65 0.180 20.0);
--destructive-foreground: oklch(0.98 0.020 20.0);

/* Info - Blue for informational content */
--info: oklch(0.65 0.150 231.99);
--info-foreground: oklch(0.98 0.020 231.99);
```

### Neutral Colors
```css
/* Background variations */
--background: oklch(0.99 0.002 106.423);
--foreground: oklch(0.20 0.015 231.99);
--muted: oklch(0.96 0.008 106.423);
--muted-foreground: oklch(0.55 0.020 231.99);
```

### Brand Palette
```css
/* Used for accents and highlights */
--palette-1: oklch(0.97 0.012 37.91); /* Warm Orange */
--palette-2: oklch(0.96 0.015 231.99); /* Cool Blue */
--palette-3: oklch(0.96 0.015 174.95); /* Teal */
--palette-4: oklch(0.97 0.008 106.423); /* Neutral */
--palette-5: oklch(0.95 0.020 290); /* Violet */
```

## Typography

### Font Stack
```css
font-family: var(--font-noto-sans-jp), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Type Scale
- **Hero**: 4xl-7xl (2.25rem - 4.5rem)
- **Heading 1**: 3xl-5xl (1.875rem - 3rem)
- **Heading 2**: 2xl-4xl (1.5rem - 2.25rem)
- **Heading 3**: xl-2xl (1.25rem - 1.5rem)
- **Body**: base-lg (1rem - 1.125rem)
- **Small**: sm-xs (0.875rem - 0.75rem)

### Font Weights
- **Regular**: 400 (body text)
- **Medium**: 500 (emphasis)
- **Semibold**: 600 (subheadings)
- **Bold**: 700 (headings)

## Spacing System

Based on 4px grid:
- **xs**: 0.25rem (4px)
- **sm**: 0.5rem (8px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)
- **2xl**: 3rem (48px)
- **3xl**: 4rem (64px)
- **4xl**: 6rem (96px)

## Component Patterns

### Buttons
- **Primary**: High emphasis actions (CTAs)
- **Secondary**: Medium emphasis actions
- **Outline**: Low emphasis actions
- **Ghost**: Minimal emphasis (navigation)
- **Destructive**: Dangerous actions

### Cards
- Border radius: 0.625rem (10px)
- Shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
- Hover state: Elevated shadow
- Padding: 1.5rem - 2rem

### Forms
- Input height: 2.5rem (40px)
- Border radius: 0.375rem (6px)
- Focus ring: 2px offset, primary color
- Label spacing: 0.5rem from input

## Animation Guidelines

### Motion Principles
- **Purposeful**: Every animation has a clear function
- **Quick**: 200-400ms for most transitions
- **Smooth**: Ease-out timing functions
- **Subtle**: Avoid distracting movements

### Common Animations
```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scale In */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

/* Slide In */
@keyframes slideIn {
  from { opacity: 0; transform: translateX(-60px); }
  to { opacity: 1; transform: translateX(0); }
}
```

## Responsive Design

### Breakpoints
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px - 1439px
- **Wide**: 1440px+

### Grid System
- Container max-width: 1280px
- Padding: 1rem (mobile), 1.5rem (tablet), 2rem (desktop)
- Column gap: 1.5rem - 2rem

## Accessibility Standards

### Color Contrast
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

### Focus States
- Visible focus indicators on all interactive elements
- 2px offset focus ring
- High contrast focus color

### ARIA Labels
- Descriptive labels for all interactive elements
- Proper heading hierarchy
- Landmark regions defined

## Dark Mode Considerations

### Color Adjustments
- Inverted lightness values
- Reduced saturation for better readability
- Adjusted contrast ratios
- Softer whites (not pure white)

### Surface Hierarchy
- Background: Near black
- Surface 1: Slightly elevated
- Surface 2: More elevated
- Surface 3: Highest elevation

## Implementation Notes

### CSS Variables
All colors are defined as CSS custom properties for easy theming and maintenance.

### Component Library
Using shadcn/ui as the base component library with custom styling overrides.

### Performance
- Prefer CSS transforms over position changes
- Use will-change sparingly
- Implement lazy loading for images
- Optimize bundle size with tree shaking