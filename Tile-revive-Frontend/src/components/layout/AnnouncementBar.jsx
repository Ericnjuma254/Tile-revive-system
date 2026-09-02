const announcement = {
    enabled: true,

    message:
        "✨ REVIVE YOUR TILES TODAY — FREE DELIVERY WITHIN NAIROBI",

    showButton: true,

    buttonText: "SHOP NOW",

    buttonLink: "/shop",
};

function AnnouncementBar() {
    if (!announcement.enabled) {
        return null;
    }

    return (
        <div className="announcement-bar">
            <div className="announcement-content">
                <span className="announcement-message">
                    {announcement.message}
                </span>

                {announcement.showButton && (
                    <a
                        href={announcement.buttonLink}
                        className="announcement-button"
                    >
                        {announcement.buttonText}
                    </a>
                )}
            </div>
        </div>
    );
}

export default AnnouncementBar;
