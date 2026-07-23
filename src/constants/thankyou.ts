export const DONORS = [
    "Ton"
];

// Every style below defines separate `light` and `dark` color variants (stroke,
// strokeWidth, gradient) instead of one fixed palette. A gradient tuned for the
// dark background (#121212) is often invisible or washed out on the light
// background (#F8F9FA) and vice versa, so each theme gets colors chosen to
// stay legible against its own background.
export const NAME_STYLES = {

    ninja: {
        font: "Burnstown",
        light: { stroke: "#000000", strokeWidth: 3, gradient: ["#2c2c2c", "#000000"] },
        dark: { stroke: "#e0e0e0", strokeWidth: 3, gradient: ["#5a5a5a", "#000000"] }
    },

    samurai: {
        font: "Burnstown",
        light: { stroke: "#4a0000", strokeWidth: 3, gradient: ["#b22222", "#8b0000"] },
        dark: { stroke: "#ffb3b3", strokeWidth: 3, gradient: ["#ff4d4d", "#8b0000"] }
    },

    angelic: {
        font: "CinzelRegular",
        glow: true,
        description: "Heaven / angel style",
        light: { stroke: "#8b6d1f", strokeWidth: 2, gradient: ["#fff3cd", "#b8860b"] },
        dark: { stroke: "#ffffff", strokeWidth: 2, gradient: ["#ffffff", "#d4af37"] }
    },

    demon: {
        font: "CinzelBlack",
        description: "Dark demon text",
        light: { stroke: "#000000", strokeWidth: 3, gradient: ["#8b0000", "#000000"] },
        dark: { stroke: "#ff6666", strokeWidth: 3, gradient: ["#ff4d4d", "#330000"] }
    },

    cyberpunk: {
        font: "VCR",
        glow: true,
        light: { stroke: "#006666", strokeWidth: 2, gradient: ["#c400c4", "#007a7a"] },
        dark: { stroke: "#00ffff", strokeWidth: 2, gradient: ["#ff00ff", "#00ffff"] }
    },

    neon: {
        font: "NeonTubes",
        glow: true,
        light: { stroke: "#005757", strokeWidth: 1, gradient: ["#a300a3", "#006666"] },
        dark: { stroke: "#00ffff", strokeWidth: 1, gradient: ["#00ffff", "#ff00ff"] }
    },

    fire: {
        font: "Saiyan",
        light: { stroke: "#3d0000", strokeWidth: 3, gradient: ["#cc2900", "#e67e00", "#e6c200"] },
        dark: { stroke: "#1a0000", strokeWidth: 3, gradient: ["#ff3300", "#ff9900", "#ffee00"] }
    },

    ice: {
        font: "Iceberg",
        light: { stroke: "#001f3f", strokeWidth: 2, gradient: ["#0288d1", "#01579b"] },
        dark: { stroke: "#e0ffff", strokeWidth: 2, gradient: ["#b3e5fc", "#00bcd4"] }
    },

    lightning: {
        font: "IcebergItalic",
        light: { stroke: "#4d4d00", strokeWidth: 3, gradient: ["#e6c200", "#8a7d00"] },
        dark: { stroke: "#000000", strokeWidth: 3, gradient: ["#ffff00", "#ffffff"] }
    },

    gold: {
        font: "CinzelBold",
        light: { stroke: "#5c3b00", strokeWidth: 2, gradient: ["#d4a017", "#8b6508"] },
        dark: { stroke: "#ffe680", strokeWidth: 2, gradient: ["#FFD700", "#b8860b"] }
    },

    silver: {
        font: "CinzelBold",
        light: { stroke: "#333333", strokeWidth: 2, gradient: ["#8c8c8c", "#4d4d4d"] },
        dark: { stroke: "#ffffff", strokeWidth: 2, gradient: ["#eeeeee", "#999999"] }
    },

    galaxy: {
        font: "VCR",
        light: { stroke: "#2b004d", strokeWidth: 2, gradient: ["#4b0082", "#6a0dad", "#008b8b"] },
        dark: { stroke: "#c9a3ff", strokeWidth: 2, gradient: ["#6a0dad", "#8a2be2", "#00ffff"] }
    },

    retro80s: {
        font: "VCR",
        light: { stroke: "#4d0026", strokeWidth: 2, gradient: ["#cc0066", "#007a7a"] },
        dark: { stroke: "#00ffff", strokeWidth: 2, gradient: ["#ff0080", "#00ffff"] }
    },

    vaporwave: {
        font: "VCR",
        light: { stroke: "#7a0052", strokeWidth: 2, gradient: ["#d6469c", "#0189a3"] },
        dark: { stroke: "#ff00ff", strokeWidth: 2, gradient: ["#ff71ce", "#01cdfe"] }
    },

    crystal: {
        font: "Iceberg",
        light: { stroke: "#006677", strokeWidth: 1, gradient: ["#4dd2e6", "#00838f"] },
        dark: { stroke: "#00ffff", strokeWidth: 1, gradient: ["#ffffff", "#00e5ff"] }
    },

    toxic: {
        font: "Iceberg",
        light: { stroke: "#1a3300", strokeWidth: 3, gradient: ["#5a9c00", "#2e7d00"] },
        dark: { stroke: "#111100", strokeWidth: 3, gradient: ["#7fff00", "#00ff00"] }
    },

    shadow: {
        font: "CinzelBlack",
        light: { stroke: "#000000", strokeWidth: 4, gradient: ["#444444", "#000000"] },
        dark: { stroke: "#999999", strokeWidth: 4, gradient: ["#666666", "#1a1a1a"] }
    },

    rainbow: {
        font: "CinzelBold",
        light: {
            stroke: "#000000",
            strokeWidth: 2,
            gradient: ["#ff0000", "#ff7f00", "#ccb800", "#00aa00", "#0000ff", "#4b0082", "#9400d3"]
        },
        dark: {
            stroke: "#ffffff",
            strokeWidth: 2,
            gradient: ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#9400d3"]
        }
    },

    poison: {
        font: "CinzelBlack",
        glow: true,
        light: { stroke: "#2e0854", strokeWidth: 3, gradient: ["#4B0082", "#6b8e00"] },
        dark: { stroke: "#ADFF2F", strokeWidth: 3, gradient: ["#8a2be2", "#ADFF2F"] }
    },

    magma: {
        font: "CinzelBold",
        light: { stroke: "#330000", strokeWidth: 4, gradient: ["#cc3700", "#660000", "#cc6600"] },
        dark: { stroke: "#ffb380", strokeWidth: 4, gradient: ["#ff4500", "#8b0000", "#ff8c00"] }
    },

    emerald: {
        font: "CinzelBold",
        light: { stroke: "#003300", strokeWidth: 2, gradient: ["#2e8b57", "#00591f"] },
        dark: { stroke: "#7fffb3", strokeWidth: 2, gradient: ["#50C878", "#00b359"] }
    },

    glitch: {
        font: "VCR",
        glow: true,
        light: { stroke: "#660066", strokeWidth: 2, gradient: ["#008b8b", "#333333", "#8b008b"] },
        dark: { stroke: "#ff00ff", strokeWidth: 2, gradient: ["#00ffff", "#ffffff", "#ff00ff"] }
    },

    zen: {
        font: "Burnstown",
        light: { stroke: "transparent", strokeWidth: 0, gradient: ["#333333", "#777777"] },
        dark: { stroke: "transparent", strokeWidth: 0, gradient: ["#aaaaaa", "#e0e0e0"] }
    },

    anime: {
        font: "Saiyan",
        light: { stroke: "#000000", strokeWidth: 4, gradient: ["#e6b800", "#995c00"] },
        dark: { stroke: "#000000", strokeWidth: 4, gradient: ["#ffffff", "#ffcc00"] }
    },

    dragonball: {
        font: "Saiyan",
        description: "Dragon Ball aura",
        light: { stroke: "#000000", strokeWidth: 4, gradient: ["#cc8400", "#cc3700"] },
        dark: { stroke: "#000000", strokeWidth: 4, gradient: ["#FFD700", "#FF4500"] }
    },
};
