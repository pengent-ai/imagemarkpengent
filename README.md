[日本語のREADMEはこちら](./README.jp.md)

# ImageMarkPengent

![logo](readme/images/logo.png)

A VSCode extension for intuitively drawing red circle marks and annotations directly on images.

---

## Features

- Draw red circle marks directly on PNG/JPG images in VSCode
- Change mark color/line width, move, resize, delete, Undo/Redo
- Save as image (red marks merged at original image size)
- Intuitive UI and keyboard shortcuts

---

## Screenshot

![Top Screen](readme/images/top.png)

---

## How to Use

### 1. Open an Image
- Right-click a PNG/JPG image in the Explorer → `Open in ImageMarkPengent`
- Or run `ImageMarkPengent: Open in ImageMarkPengent` from the Command Palette

### 2. Draw a Mark
- Click the "Add Mark" button (or Ctrl+drag)
- Drag on the image to draw a red circle

### 3. Edit Marks
- Click the "Select Mode" button to select a mark
- For the selected mark:
    - Drag to move
    - Drag the corner handles to resize
    - Change color/line width from the toolbar
    - Delete with the Delete key
- Undo (Ctrl+Z) and Redo (Ctrl+Y) are available

### 4. Save the Image
- Click the "Save" button
- Choose a file name and location; the image will be saved as PNG with red marks at the original size

---

## Toolbar Guide

- **Move Mode**: Scroll/zoom the image
- **Select Mode**: Select and edit marks
- **Add Mark**: Add a new red circle mark
- **Line Width/Color**: Change the mark's line width and color
- **Save**: Save the edited image

---

## Keyboard Shortcuts

- Ctrl+drag: Temporarily add a mark
- Delete/Backspace: Delete selected mark
- Ctrl+Z: Undo
- Ctrl+Y: Redo
- Esc: Return to Move Mode

---

## FAQ

- **Q. Will the original image be overwritten?**
  - A. You can specify a new file name when saving. The original image is not changed.
- **Q. Can I edit multiple marks at once?**
  - A. Multi-selection is not supported yet, but is planned for future updates.

---

## Sample Image

![Sample Image](examples/sample_640x480.png)

---

## Install & Build

1. Install dependencies
   ```sh
   yarn install
   ```
2. Build
   ```sh
   yarn compile
   ```
3. Press F5 to launch in debug mode

---

## License
MIT License 