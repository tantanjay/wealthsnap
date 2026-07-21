import React from 'react';
import { Canvas, Text, LinearGradient, vec, BlurMask, Paint, useFont } from "@shopify/react-native-skia";
import { useTheme } from '@context/ThemeContext';

// NOTE: React Native's 'require' MUST be a static string at compile time. 
// It does NOT support template literals like require(`@fonts/${name}.ttf`).
// That's why we use this FONT_MAP to link style configuration names to their actual assets.
const FONT_MAP: Record<string, any> = {
    Saiyan: require("@fonts/Saiyan-Sans.ttf"),
    CinzelRegular: require("@fonts/CinzelDecorative-Regular.ttf"),
    CinzelBold: require("@fonts/CinzelDecorative-Bold.ttf"),
    CinzelBlack: require("@fonts/CinzelDecorative-Black.ttf"),
    Iceberg: require("@fonts/Iceberg.ttf"),
    IcebergItalic: require("@fonts/Iceberg-Italic.ttf"),
    VCR: require("@fonts/VCR_OSD_MONO_1.001.ttf"),
    NeonTubes: require("@fonts/neon-tubes.ttf"),
    Burnstown: require("@fonts/Burnstown Dam.otf"),
};

export const StyledDonorName = ({ name, styleConfig }: { name: string, styleConfig: any }) => {
    // 1. Load the specific font for this style from the map
    const fontSource = FONT_MAP[styleConfig.font];
    const font = useFont(fontSource, 32);

    // Many name styles (e.g. "ninja", "shadow", "demon") use near-black strokes/gradients
    // that vanish against a dark background. A black shadow only helps on light backgrounds,
    // so flip it to a light backlight in dark mode to keep every style legible either way.
    const { theme } = useTheme();
    const isDark = theme.mode === 'dark';
    const backlightColor = isDark ? '#FFFFFF' : '#000000';

    if (!font) return null;

    const textWidth = font.measureText(name).width;
    const canvasWidth = textWidth + 40; // Add padding to avoid cut-off with glow/stroke

    return (
        <Canvas style={{ width: canvasWidth, height: 100 }}>
            {/* LAYER 0: Universal backlight/shadow for contrast against the current theme's background */}
            <Text text={name} x={10.5} y={50.5} font={font}>
                <Paint color={backlightColor} opacity={isDark ? 0.6 : 0.5}>
                    <BlurMask blur={isDark ? 5 : 3} style="normal" />
                </Paint>
            </Text>

            {/* LAYER 1: The Outer Glow (if styleConfig.glow is true) */}
            {styleConfig.glow && (
                <Text text={name} x={10} y={50} font={font}>
                    <Paint color={styleConfig.stroke} opacity={0.5}>
                        <BlurMask blur={8} style="normal" />
                    </Paint>
                </Text>
            )}

            {/* LAYER 2: The Stroke (Outline) */}
            <Text
                text={name}
                x={10}
                y={50}
                font={font}
                color={styleConfig.stroke}
                style="stroke"
                strokeWidth={styleConfig.strokeWidth}
            />

            {/* LAYER 3: The Gradient Fill */}
            <Text text={name} x={10} y={50} font={font}>
                <LinearGradient
                    start={vec(0, 20)}
                    end={vec(0, 60)}
                    colors={styleConfig.gradient}
                />
            </Text>
        </Canvas>
    );
};