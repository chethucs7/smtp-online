import os
import random
import string
import logging
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'fallback-secret-key-change-me')

# ── Database Configuration ──────────────────────────────────────────
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# ── Mail Configuration (SSL on port 465 for Render compatibility) ───
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = os.getenv('EMAIL_USER')
app.config['MAIL_PASSWORD'] = os.getenv('EMAIL_PASS')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('EMAIL_USER')

db = SQLAlchemy(app)
mail = Mail(app)


# ── Database Model ──────────────────────────────────────────────────
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    otp_code = db.Column(db.String(6), nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<User {self.email}>'


# ── Helper: Generate 6-digit OTP ────────────────────────────────────
def generate_otp():
    return ''.join(random.choices(string.digits, k=6))


# ── Helper: Send OTP Email ──────────────────────────────────────────
def send_otp_email(recipient_email, otp_code):
    msg = Message(
        subject='Your OTP Code',
        recipients=[recipient_email]
    )
    msg.html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); border-radius: 16px; color: #ffffff;">
        <h2 style="text-align: center; margin-bottom: 8px; font-size: 22px;">Email Verification</h2>
        <p style="text-align: center; color: #b0b0cc; font-size: 14px;">Use the code below to verify your account</p>
        <div style="text-align: center; margin: 28px 0;">
            <span style="display: inline-block; font-size: 36px; font-weight: 700; letter-spacing: 12px; padding: 16px 32px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; color: #a78bfa;">{otp_code}</span>
        </div>
        <p style="text-align: center; color: #8888aa; font-size: 13px;">This code will expire shortly. Do not share it with anyone.</p>
    </div>
    """
    mail.send(msg)


# ── Helper: Send Welcome Email ──────────────────────────────────────
def send_welcome_email(recipient_email, name):
    msg = Message(
        subject='Welcome to Our Platform',
        recipients=[recipient_email]
    )
    msg.html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); border-radius: 16px; color: #ffffff;">
        <h2 style="text-align: center; margin-bottom: 8px; font-size: 22px;">Welcome, {name}! 🎉</h2>
        <p style="text-align: center; color: #b0b0cc; font-size: 15px; line-height: 1.6;">
            Your account has been successfully verified.<br>
            We're thrilled to have you on board!
        </p>
        <div style="text-align: center; margin-top: 24px;">
            <span style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #7c3aed, #a78bfa); border-radius: 8px; color: #fff; font-weight: 600; font-size: 14px;">You're all set ✓</span>
        </div>
        <p style="text-align: center; color: #8888aa; font-size: 13px; margin-top: 20px;">Thank you for joining our platform.</p>
    </div>
    """
    mail.send(msg)


# ── Routes ──────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/register', methods=['POST'])
def register():
    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip()
    password = request.form.get('password', '').strip()

    # Server-side validation
    if not name or not email or not password:
        flash('All fields are required.', 'error')
        return redirect(url_for('index'))

    if len(password) < 6:
        flash('Password must be at least 6 characters.', 'error')
        return redirect(url_for('index'))

    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        if existing_user.is_verified:
            flash('An account with this email already exists.', 'error')
            return redirect(url_for('index'))
        else:
            # Update existing unverified user
            existing_user.name = name
            existing_user.password = generate_password_hash(password)
            otp = generate_otp()
            existing_user.otp_code = otp
            db.session.commit()
            session['verify_email'] = email
            try:
                send_otp_email(email, otp)
            except Exception as e:
                flash('Failed to send OTP email. Please try again.', 'error')
                return redirect(url_for('index'))
            return redirect(url_for('verify'))

    # Create new user
    otp = generate_otp()
    hashed_password = generate_password_hash(password)
    new_user = User(
        name=name,
        email=email,
        password=hashed_password,
        otp_code=otp,
        is_verified=False
    )
    db.session.add(new_user)
    db.session.commit()

    session['verify_email'] = email

    try:
        send_otp_email(email, otp)
    except Exception as e:
        flash('Failed to send OTP email. Please try again.', 'error')
        return redirect(url_for('index'))

    return redirect(url_for('verify'))


@app.route('/verify')
def verify():
    if 'verify_email' not in session:
        flash('Please register first.', 'error')
        return redirect(url_for('index'))
    return render_template('verify.html', email=session.get('verify_email'))


@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    if 'verify_email' not in session:
        flash('Session expired. Please register again.', 'error')
        return redirect(url_for('index'))

    email = session['verify_email']
    entered_otp = request.form.get('otp', '').strip()

    user = User.query.filter_by(email=email).first()
    if not user:
        flash('User not found. Please register again.', 'error')
        return redirect(url_for('index'))

    if user.otp_code == entered_otp:
        user.is_verified = True
        user.otp_code = None
        db.session.commit()

        try:
            send_welcome_email(email, user.name)
        except Exception:
            pass  # Welcome email is non-critical

        session.pop('verify_email', None)
        return redirect(url_for('success', name=user.name))
    else:
        flash('Invalid OTP. Please try again.', 'error')
        return redirect(url_for('verify'))


@app.route('/success')
def success():
    name = request.args.get('name', 'User')
    return render_template('success.html', name=name)


# ── Create Database Tables ──────────────────────────────────────────
with app.app_context():
    db.create_all()


# ── App Entry Point ─────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
