// Info Section explaining "Why AlphaPulse?"
const InfoSection = () => {
    return (
        <div className="info-section">
            <h2>Why AlphaPulse?</h2>
            <div className="benefits">
                <div className="benefit-card">
                    <h3>Real-Time Intelligence</h3>
                    <p>Get insights and updates as they happen, enhancing your investment decisions.</p>
                </div>
                <div className="benefit-card">
                    <h3>AI-Powered Predictions</h3>
                    <p>Leverage advanced algorithms to forecast market trends and make informed choices.</p>
                </div>
                <div className="benefit-card">
                    <h3>Early Advantage</h3>
                    <p>Be the first to know about emerging opportunities boosting your portfolio.</p>
                </div>
            </div>
        </div>
    );
};

// Updated section titles with emojis
const HighAlphaPicks = () => <h2>🔥 High Alpha Picks</h2>;
const NewListings = () => <h2>🆕 New Listings</h2>;
const TrendingTokens = () => <h2>📈 Trending Tokens</h2>;

export { InfoSection, HighAlphaPicks, NewListings, TrendingTokens };