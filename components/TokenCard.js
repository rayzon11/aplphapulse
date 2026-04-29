function predict(score, volume) {
    if (score > 75 && volume > 50000) {
        return "STRONG BUY";
    } else if (score > 60) {
        return "WATCH";
    } else {
        return "AVOID";
    }
}

// Add glow effects to prediction badges and high alpha styling for premium tokens
const badgeStyles = {
    glow: '0 0 20px rgba(255, 215, 0, 1)', // Gold color for strong buy
    alpha: 0.8 // For premium tokens
};