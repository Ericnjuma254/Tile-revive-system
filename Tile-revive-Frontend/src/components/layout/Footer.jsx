import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
    return (
        <footer className="site-footer">
            <div className="footer-container">

                {/* Social Media */}
                <div className="footer-social">
                    <h3>Tile Revive</h3>
                    <p>Follow us and stay updated.</p>

                    <div className="social-links">
                        <a href="#" target="_blank" rel="noopener noreferrer">
                            Facebook
                        </a>

                        <a href="#" target="_blank" rel="noopener noreferrer">
                            Instagram
                        </a>

                        <a href="#" target="_blank" rel="noopener noreferrer">
                            TikTok
                        </a>

                        <a href="#" target="_blank" rel="noopener noreferrer">
                            WhatsApp
                        </a>
                    </div>
                </div>

                {/* Admin */}
                <div className="footer-admin">
                    <span>Are you an administrator?</span>

                    <Link to="/admin/login" className="admin-button">
                        Admin Panel
                    </Link>
                </div>

            </div>

            <div className="footer-bottom">

                <div className="footer-legal">
                    <Link to="/privacy-policy" className="privacy-policy-link">
                        Privacy Policy
                    </Link>
                    <Link to="/terms-of-service" className="terms-of-service-link">
                        Terms of Service
                    </Link>
                </div>

                <p>
                    © {new Date().getFullYear()} Tile Revive Solutions.
                    All rights reserved.
                </p>

            </div>
        </footer>
    );
};

export default Footer;

