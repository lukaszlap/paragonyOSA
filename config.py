# -*- coding: utf-8 -*-
"""
Configuration file for Flask application
Obsługuje polskie znaki: ą, ć, ę, ł, ń, ó, ś, ź, ż
"""
import os

from flask import app

class Config:
    """Bazowa konfiguracja"""
    
    # Secret keys — set via environment variables (see .env.example)
    SECRET_KEY = os.getenv('SECRET_KEY')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    
    # JWT configuration
    JWT_ACCESS_TOKEN_EXPIRES_DAYS = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_DAYS', 1))
    
    # Database configuration — all values must be set in environment / .env
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    DB_NAME = os.getenv('DB_NAME', 'paragony')
    
    # SQLAlchemy configuration with PyMySQL
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,  # Verify connections before using them
        'pool_recycle': 3600,   # Recycle connections after 1 hour
        'pool_size': 10,
        'max_overflow': 20
    }
    
    # CORS configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
    
    # Gemini API Configuration — set GEMINI_API_KEY in environment
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config(config_name=None):
    """Get configuration by name"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    return config.get(config_name, config['default'])
