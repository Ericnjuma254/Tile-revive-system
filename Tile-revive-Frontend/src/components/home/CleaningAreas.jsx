import { Link } from "react-router-dom";

const cleaningAreas = [
    {
        title: "Stained / Discoloured Tiles",
        description:
            "Tackle stubborn stains, dirt buildup and discolouration that make tiled surfaces look dull.",
        tag: "TILES",
        icon: "🧱",
        path: "/cleaning/stained-discoloured-tiles"
    },
    {
        title: "Tile Grout",
        description:
            "Refresh dirty and discoloured grout lines and bring back a cleaner-looking finish.",
        tag: "GROUT",
        icon: "▦",
        path: "/cleaning/tile-grout"
    },
    {
        title: "Ceramic Surfaces",
        description:
            "Clean suitable ceramic surfaces and remove everyday dirt, stains and surface buildup.",
        tag: "CERAMIC",
        icon: "✨",
        path: "/cleaning/ceramic-surfaces"
    },
    {
        title: "Rust Deposits",
        description:
            "Target stubborn rust deposits and mineral buildup on suitable surfaces.",
        tag: "STAINS",
        icon: "🟤",
        path: "/cleaning/rust-deposits"
    },
    {
        title: "Toilet Bowls",
        description:
            "Help tackle stains and buildup on suitable toilet bowl surfaces for a cleaner appearance.",
        tag: "BATHROOM",
        icon: "🚽",
        path: "/cleaning/toilet-bowls"
    },
    {
        title: "Sink Bowls",
        description:
            "Clean suitable sink surfaces affected by stains, grime and everyday buildup.",
        tag: "BATHROOM",
        icon: "🚰",
        path: "/cleaning/sink-bowls"
    },
    {
        title: "Mirror Stains",
        description:
            "Help remove suitable stains and buildup from mirror and glass surfaces.",
        tag: "GLASS",
        icon: "🪞",
        path: "/cleaning/mirror-stains"
    },
    {
        title: "Gum Stains",
        description:
            "Target stubborn gum residue and surface marks on suitable hard surfaces.",
        tag: "STAINS",
        icon: "🫧",
        path: "/cleaning/gum-stains"
    },
    {
        title: "Oil / Grease Stains",
        description:
            "Take on suitable oil, grease and grime buildup affecting your surfaces.",
        tag: "GREASE",
        icon: "🛢️",
        path: "/cleaning/oil-grease-stains"
    },
    {
        title: "Discoloured Terrazzo",
        description:
            "Refresh suitable terrazzo surfaces affected by dirt, stains and discolouration.",
        tag: "TERRAZZO",
        icon: "🏡",
        path: "/cleaning/discoloured-terrazzo"
    },
    {
        title: "Porcelain",
        description:
            "Clean suitable porcelain surfaces and help restore their fresh, clean appearance.",
        tag: "PORCELAIN",
        icon: "◻️",
        path: "/cleaning/porcelain"
    },
    {
        title: "More Surfaces",
        description:
            "Discover more suitable cleaning applications and ways Tile Revive can help.",
        tag: "EXPLORE",
        icon: "＋",
        path: "/cleaning"
    }
];

function CleaningAreas() {
    return (
        <section
            id="cleaning-areas"
            className="cleaning-areas-section"
        >
            <div className="container">

                <div className="cleaning-areas-header">

                    <div>
                        <span className="section-eyebrow">
                            WHAT CAN YOU CLEAN?
                        </span>

                        <h2 className="section-title">
                            One Solution.
                            <span> Multiple Surfaces.</span>
                        </h2>
                    </div>

                    <p className="cleaning-areas-intro">
                        From stained tiles and dirty grout to rust,
                        grease and other stubborn buildup, explore
                        the surfaces Tile Revive is designed to help clean.
                    </p>

                </div>


                <div className="cleaning-areas-grid">

                    {cleaningAreas.map((area) => (

                        <Link
                            key={area.title}
                            to={area.path}
                            className="cleaning-area-card"
                        >

                            <div className="cleaning-area-top">

                                <div className="cleaning-area-icon">
                                    {area.icon}
                                </div>

                                <span className="cleaning-area-arrow">
                                    ↗
                                </span>

                            </div>


                            <div className="cleaning-area-content">

                                <span className="cleaning-area-tag">
                                    {area.tag}
                                </span>

                                <h3>
                                    {area.title}
                                </h3>

                                <p>
                                    {area.description}
                                </p>

                            </div>


                            <div className="cleaning-area-bottom">

                                <span>
                                    Explore surface
                                </span>

                                <span>
                                    →
                                </span>

                            </div>

                        </Link>

                    ))}

                </div>


                <div className="cleaning-note">

                    <span className="cleaning-note-icon">
                        ✓
                    </span>

                    <p>
                        <strong>Important:</strong>{" "}
                        Always test Tile Revive on a small,
                        inconspicuous area first. Do not use on
                        polished marble, granite, sandstone or wood.
                    </p>

                </div>

            </div>
        </section>
    );
}

export default CleaningAreas;