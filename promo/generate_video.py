#!/usr/bin/env python3
"""
noui.bot 30-second promo video generator.
Uses PIL for frame generation + ffmpeg for encoding.
Output: 1920x1080 @ 30fps, monospace typography, black/white.
"""

import os
import subprocess
from PIL import Image, ImageDraw, ImageFont
import math

# Config
W, H = 1920, 1080
FPS = 30
DURATION = 30  # seconds
TOTAL_FRAMES = FPS * DURATION
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
FRAMES_DIR = os.path.join(OUTPUT_DIR, "frames")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "noui_bot_promo_v1.mp4")

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
DIM_WHITE = (100, 100, 100)
GREEN = (0, 200, 80)
RED = (200, 60, 60)
VERY_DIM = (40, 40, 40)

# Try to find a good monospace font
FONT_PATHS = [
    "/System/Library/Fonts/SFMono-Regular.otf",
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Monaco.dfont",
    "/System/Library/Fonts/Courier.dfont",
    "/Library/Fonts/JetBrainsMono-Regular.ttf",
]

def get_font(size):
    for path in FONT_PATHS:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                continue
    return ImageFont.load_default()

def get_bold_font(size):
    bold_paths = [
        "/System/Library/Fonts/SFMono-Bold.otf",
        "/System/Library/Fonts/SFMono-Semibold.otf",
    ] + FONT_PATHS
    for path in bold_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                continue
    return get_font(size)

# Fonts
font_sm = get_font(22)
font_md = get_font(32)
font_lg = get_font(48)
font_xl = get_font(72)
font_xxl = get_bold_font(96)
font_title = get_bold_font(120)

os.makedirs(FRAMES_DIR, exist_ok=True)


def new_frame():
    return Image.new("RGB", (W, H), BLACK)


def ease_in_out(t):
    """Smooth easing function."""
    return t * t * (3 - 2 * t)


def fade_alpha(t, fade_in=0.0, fade_out=1.0, in_dur=0.15, out_dur=0.15):
    """Calculate alpha for fade in/out within a segment."""
    if t < fade_in + in_dur:
        progress = max(0, (t - fade_in) / in_dur)
        return ease_in_out(min(1.0, progress))
    elif t > fade_out - out_dur:
        progress = max(0, (fade_out - t) / out_dur)
        return ease_in_out(min(1.0, progress))
    return 1.0


def color_with_alpha(color, alpha):
    """Apply alpha to a color against black background."""
    return tuple(int(c * alpha) for c in color)


def draw_cursor(draw, x, y, font, alpha=1.0, frame_num=0):
    """Draw a blinking cursor."""
    if (frame_num // 15) % 2 == 0:  # Blink every 0.5s
        color = color_with_alpha(GREEN, alpha)
        draw.text((x, y), "█", fill=color, font=font)


def typewriter_text(text, progress):
    """Return text up to progress (0-1)."""
    chars = int(len(text) * min(1.0, progress))
    return text[:chars]


# ============================================================
# SCENE DEFINITIONS
# ============================================================

# Scene timing (in seconds)
SCENES = {
    "wall_1": (0.0, 3.0),      # POST /submit-application → 403
    "wall_2": (3.0, 6.0),      # POST /create-account → CAPTCHA  
    "wall_3": (6.0, 10.0),     # Rapid-fire rejections
    "blackout": (10.0, 12.0),  # Pure black, silence
    "text_1": (12.0, 15.0),    # "The internet wasn't built for agents."
    "text_2": (15.0, 18.0),    # Stats
    "void_line": (18.0, 20.0), # Horizontal line expands
    "logo": (20.0, 23.0),      # noui.bot materializes
    "proof": (23.0, 27.0),     # Real terminal output
    "cta": (27.0, 30.0),       # "The void is open."
}


def render_wall_scene(draw, frame_num, request_text, response_text, response_color,
                      scene_start, scene_end, t):
    """Render a wall scene with typing + response."""
    local_t = (t - scene_start) / (scene_end - scene_start)
    
    # Terminal chrome
    y_base = H // 2 - 60
    prompt_color = color_with_alpha(GREEN, 0.7)
    
    # Phase 1: Type the request (0-40%)
    if local_t < 0.4:
        type_progress = local_t / 0.4
        typed = typewriter_text(request_text, type_progress)
        draw.text((120, y_base), "$ ", fill=prompt_color, font=font_md)
        draw.text((160, y_base), typed, fill=color_with_alpha(WHITE, 0.9), font=font_md)
        cursor_x = 160 + font_md.getlength(typed)
        draw_cursor(draw, cursor_x, y_base, font_md, 0.9, frame_num)
    
    # Phase 2: Show full request (40-50%)
    elif local_t < 0.5:
        draw.text((120, y_base), "$ ", fill=prompt_color, font=font_md)
        draw.text((160, y_base), request_text, fill=color_with_alpha(WHITE, 0.9), font=font_md)
    
    # Phase 3: Response slams in (50-100%)
    else:
        response_progress = (local_t - 0.5) / 0.5
        draw.text((120, y_base), "$ ", fill=prompt_color, font=font_md)
        draw.text((160, y_base), request_text, fill=color_with_alpha(DIM_WHITE, 0.5), font=font_md)
        
        if response_progress > 0.1:
            alpha = min(1.0, (response_progress - 0.1) / 0.2)
            draw.text((120, y_base + 50), response_text,
                      fill=color_with_alpha(response_color, alpha), font=font_md)


def render_rapid_fire(draw, frame_num, t):
    """Render rapid-fire rejections, accelerating."""
    local_t = (t - 6.0) / 4.0  # 6-10s = 4s scene
    
    rejections = [
        ("POST /checkout →", '"Session expired. Please log in."'),
        ("POST /deploy →", '"Verify your identity."'),
        ("POST /book-flight →", '"Are you human?"'),
        ("POST /transfer →", '"Complete 2FA verification."'),
        ("POST /register →", '"JavaScript required."'),
        ("POST /purchase →", '"Browser fingerprint failed."'),
    ]
    
    # Each rejection appears faster than the last
    y_start = 180
    line_height = 65
    visible_count = 0
    
    for i, (req, resp) in enumerate(rejections):
        # Stagger: first appears at t=0, each subsequent faster
        delay = sum(0.25 * (0.7 ** j) for j in range(i))
        if local_t > delay:
            visible_count += 1
            y = y_start + i * line_height
            
            # Fade older ones
            age = local_t - delay
            alpha = max(0.2, 1.0 - (age * 0.3))
            
            draw.text((120, y), "$ " + req,
                      fill=color_with_alpha(DIM_WHITE, alpha * 0.5), font=font_sm)
            
            if local_t > delay + 0.15:
                draw.text((120, y + 28), "  " + resp,
                          fill=color_with_alpha(RED, alpha * 0.8), font=font_sm)
    
    # Final flash effect at the end
    if local_t > 0.85:
        flash = (local_t - 0.85) / 0.15
        if flash < 0.5:
            overlay_alpha = int(30 * (1 - flash * 2))
            # Subtle red flash
            for y in range(0, H, 2):
                draw.line([(0, y), (W, y)], fill=(overlay_alpha, 0, 0))


def render_text_reveal(draw, text, t_local, y_pos=None, font_to_use=None, color=WHITE):
    """Fade in text with slight upward drift."""
    if font_to_use is None:
        font_to_use = font_lg
    if y_pos is None:
        y_pos = H // 2
    
    alpha = ease_in_out(min(1.0, t_local * 2))
    drift = int(20 * (1 - alpha))
    
    # Center text
    bbox = font_to_use.getbbox(text)
    text_w = bbox[2] - bbox[0]
    x = (W - text_w) // 2
    
    draw.text((x, y_pos + drift), text,
              fill=color_with_alpha(color, alpha), font=font_to_use)


def render_frame(frame_num):
    """Render a single frame."""
    img = new_frame()
    draw = ImageDraw.Draw(img)
    t = frame_num / FPS  # Current time in seconds
    
    # === WALL 1: POST /submit-application → 403 ===
    s, e = SCENES["wall_1"]
    if s <= t < e:
        render_wall_scene(
            draw, frame_num,
            "POST /submit-application →",
            "403 FORBIDDEN — Complete CAPTCHA to continue.",
            RED, s, e, t
        )
    
    # === WALL 2: POST /create-account → CAPTCHA ===
    s, e = SCENES["wall_2"]
    if s <= t < e:
        render_wall_scene(
            draw, frame_num,
            "POST /create-account →",
            '"Please click all squares containing traffic lights."',
            RED, s, e, t
        )
    
    # === WALL 3: Rapid-fire rejections ===
    s, e = SCENES["wall_3"]
    if s <= t < e:
        render_rapid_fire(draw, frame_num, t)
    
    # === BLACKOUT ===
    # s, e = SCENES["blackout"]  — just black, nothing to render
    
    # === TEXT 1: "The internet wasn't built for agents." ===
    s, e = SCENES["text_1"]
    if s <= t < e:
        local = (t - s) / (e - s)
        render_text_reveal(draw, "The internet wasn't built for agents.",
                          local, y_pos=H // 2 - 40, font_to_use=font_lg)
    
    # === TEXT 2: Stats ===
    s, e = SCENES["text_2"]
    if s <= t < e:
        local = (t - s) / (e - s)
        
        # Line 1
        if local > 0:
            render_text_reveal(draw, "50% of all web traffic is non-human.",
                              min(1.0, local * 3), y_pos=H // 2 - 70,
                              font_to_use=font_md, color=(180, 180, 180))
        
        # Line 2 (delayed)
        if local > 0.35:
            render_text_reveal(draw, "0% of web infrastructure serves them.",
                              min(1.0, (local - 0.35) * 3), y_pos=H // 2,
                              font_to_use=font_md, color=WHITE)
    
    # === VOID LINE: horizontal line expands ===
    s, e = SCENES["void_line"]
    if s <= t < e:
        local = (t - s) / (e - s)
        progress = ease_in_out(min(1.0, local * 1.5))
        
        line_half_width = int((W // 2) * progress)
        center_x = W // 2
        center_y = H // 2
        
        # Thin white line expanding from center
        alpha = min(1.0, local * 3)
        line_color = color_with_alpha((255, 255, 255), alpha * 0.4)
        draw.line(
            [(center_x - line_half_width, center_y),
             (center_x + line_half_width, center_y)],
            fill=line_color, width=1
        )
        
        # Subtle glow around line
        for offset in range(1, 4):
            glow_alpha = alpha * 0.1 * (1 - offset / 4)
            glow_color = color_with_alpha((255, 255, 255), glow_alpha)
            draw.line(
                [(center_x - line_half_width, center_y + offset),
                 (center_x + line_half_width, center_y + offset)],
                fill=glow_color, width=1
            )
            draw.line(
                [(center_x - line_half_width, center_y - offset),
                 (center_x + line_half_width, center_y - offset)],
                fill=glow_color, width=1
            )
    
    # === LOGO: noui.bot materializes ===
    s, e = SCENES["logo"]
    if s <= t < e:
        local = (t - s) / (e - s)
        
        # Logo fades in
        logo_alpha = ease_in_out(min(1.0, local * 2))
        
        # "noui.bot" centered
        logo_text = "noui.bot"
        bbox = font_title.getbbox(logo_text)
        text_w = bbox[2] - bbox[0]
        x = (W - text_w) // 2
        y = H // 2 - 80
        
        draw.text((x, y), logo_text,
                  fill=color_with_alpha(WHITE, logo_alpha), font=font_title)
        
        # Subtitle fades in delayed
        if local > 0.3:
            sub_alpha = ease_in_out(min(1.0, (local - 0.3) * 2.5))
            sub_text = "Agent-first infrastructure."
            bbox = font_md.getbbox(sub_text)
            sub_w = bbox[2] - bbox[0]
            sub_x = (W - sub_w) // 2
            
            draw.text((sub_x, y + 140), sub_text,
                      fill=color_with_alpha(DIM_WHITE, sub_alpha), font=font_md)
        
        # Keep the line visible but fading
        line_alpha = max(0, 1.0 - local * 2) * 0.3
        if line_alpha > 0:
            draw.line([(0, H // 2), (W, H // 2)],
                      fill=color_with_alpha(WHITE, line_alpha), width=1)
    
    # === PROOF: Real terminal output ===
    s, e = SCENES["proof"]
    if s <= t < e:
        local = (t - s) / (e - s)
        
        endpoints = [
            ("POST", "/api/v1/feedback", "→ 201 CREATED", GREEN),
            ("POST", "/api/v1/apply", "→ 201 CREATED", GREEN),
            ("GET ", "/api/v1/health", '→ { "healthy": true }', GREEN),
            ("GET ", "/.well-known/agents.json", "→ 200 OK", GREEN),
        ]
        
        y_start = 280
        line_h = 70
        
        for i, (method, path, response, color) in enumerate(endpoints):
            delay = i * 0.15
            if local > delay:
                entry_alpha = ease_in_out(min(1.0, (local - delay) * 4))
                
                x = 300
                y = y_start + i * line_h
                
                draw.text((x, y), method,
                          fill=color_with_alpha((100, 180, 255), entry_alpha), font=font_md)
                draw.text((x + font_md.getlength(method) + 10, y), path,
                          fill=color_with_alpha(WHITE, entry_alpha * 0.9), font=font_md)
                draw.text((x + font_md.getlength(method + " " + path) + 20, y), response,
                          fill=color_with_alpha(color, entry_alpha), font=font_md)
        
        # Bottom text
        if local > 0.5:
            bottom_alpha = ease_in_out(min(1.0, (local - 0.5) * 3))
            bottom_text = "Live now. Built by one human and one AI."
            bbox = font_md.getbbox(bottom_text)
            bw = bbox[2] - bbox[0]
            draw.text(((W - bw) // 2, y_start + len(endpoints) * line_h + 60),
                      bottom_text,
                      fill=color_with_alpha(DIM_WHITE, bottom_alpha), font=font_md)
    
    # === CTA: The void is open. ===
    s, e = SCENES["cta"]
    if s <= t < e:
        local = (t - s) / (e - s)
        
        # "noui.bot" 
        if local > 0:
            alpha = ease_in_out(min(1.0, local * 3))
            text = "noui.bot"
            bbox = font_xl.getbbox(text)
            tw = bbox[2] - bbox[0]
            draw.text(((W - tw) // 2, H // 2 - 70), text,
                      fill=color_with_alpha(WHITE, alpha), font=font_xl)
        
        # "The void is open."
        if local > 0.3:
            alpha = ease_in_out(min(1.0, (local - 0.3) * 3))
            text = "The void is open."
            bbox = font_md.getbbox(text)
            tw = bbox[2] - bbox[0]
            draw.text(((W - tw) // 2, H // 2 + 30), text,
                      fill=color_with_alpha(DIM_WHITE, alpha), font=font_md)
    
    return img


# ============================================================
# MAIN
# ============================================================

def main():
    print(f"Generating {TOTAL_FRAMES} frames at {FPS}fps ({DURATION}s)...")
    print(f"Resolution: {W}x{H}")
    print(f"Output: {OUTPUT_FILE}")
    print()
    
    for i in range(TOTAL_FRAMES):
        img = render_frame(i)
        frame_path = os.path.join(FRAMES_DIR, f"frame_{i:05d}.png")
        img.save(frame_path, "PNG")
        
        if i % (FPS * 2) == 0:  # Progress every 2s
            t = i / FPS
            print(f"  [{t:.0f}s / {DURATION}s] Frame {i}/{TOTAL_FRAMES}")
    
    print("\nEncoding video with ffmpeg...")
    
    # Encode with ffmpeg
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", os.path.join(FRAMES_DIR, "frame_%05d.png"),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "slow",
        "-crf", "18",
        "-movflags", "+faststart",
        OUTPUT_FILE
    ]
    
    subprocess.run(cmd, check=True)
    
    # Get file size
    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"\nDone! Output: {OUTPUT_FILE} ({size_mb:.1f} MB)")
    
    # Cleanup frames
    print("Cleaning up frames...")
    for f in os.listdir(FRAMES_DIR):
        os.remove(os.path.join(FRAMES_DIR, f))
    os.rmdir(FRAMES_DIR)
    print("Complete.")


if __name__ == "__main__":
    main()
