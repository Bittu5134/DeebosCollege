import { ArrowLeft, Shield, FileText } from 'lucide-react';

export default function LegalPage({ type, onBack }) {
  const isPrivacy = type === 'privacy';

  return (
    <div className="predictor-main">
      <div className="predictor-card legal-card" style={{ maxWidth: '800px', width: '100%', margin: '40px auto', padding: '32px' }}>
        <button 
          onClick={onBack} 
          className="nav-btn-secondary" 
          style={{ marginBottom: '24px', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          {isPrivacy ? (
            <Shield size={32} style={{ color: 'var(--primary-green)' }} />
          ) : (
            <FileText size={32} style={{ color: 'var(--primary-green)' }} />
          )}
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {isPrivacy ? 'Privacy Policy' : 'Terms and Conditions'}
          </h1>
        </div>

        <div className="legal-content" style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '15px', 
          lineHeight: '1.7', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px',
          textAlign: 'left'
        }}>
          {isPrivacy ? (
            <>
              <p>Last updated: June 7, 2026</p>
              <p>
                Welcome to BranchWise, an AI-powered college predictor tool. We respect your privacy and are committed to protecting the information you share with us. This Privacy Policy explains how we collect, use, and safeguard your data.
              </p>

              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '10px' }}>1. Information We Collect</h3>
              <p>
                We collect information that you explicitly provide when using our predictor tool, including:
              </p>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>Academic Details:</strong> Ranks (JEE Main, JEE Advanced), home state, category, and gender.</li>
                <li><strong>Preferences:</strong> Academic and campus preferences (such as interest in coding culture, research, startups, or placements).</li>
                <li><strong>Account Information:</strong> Account identifiers and email when you create an account or sign in.</li>
              </ul>

              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '10px' }}>2. How We Use Your Information</h3>
              <p>
                The information collected is used for the following purposes:
              </p>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>To perform similarity queries on our database and provide college and branch recommendations.</li>
                <li>To generate personalized, context-specific counselor explanations using AI.</li>
                <li>To monitor and maintain search statistics to optimize our services.</li>
              </ul>

              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '10px' }}>3. Data Storage and Security</h3>
              <p>
                We prioritize the security of your data. Your preferences and information are securely processed and stored. We do not sell or lease your personal information to third parties.
              </p>

              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '10px' }}>4. AI and Third-Party API Services</h3>
              <p>
                Our recommendation explanations are generated using Google Gemini API services. Academic preferences and criteria are passed to the API to produce descriptions. No personally identifying information is sent to third-party model providers.
              </p>

              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '10px' }}>5. Contact Us</h3>
              <p>
                If you have questions about this policy, you can reach out to us at yash@alphajee.online.
              </p>
            </>
          ) : (
            <>
              <p>Last updated: June 7, 2026</p>
              <p>
                Please read these Terms and Conditions carefully before using the BranchWise college predictor. By accessing or using our services, you agree to be bound by these terms.
              </p>

              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '10px' }}>1. Description of Service</h3>
              <p>
                BranchWise provides college eligibility and branch predictions based on historical JoSAA and CSAB opening and closing ranks. It utilizes a retrieval system and an AI layer to offer customized counselor explanations.
              </p>

              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '10px' }}>2. Disclaimer of Accuracy</h3>
              <p>
                The predictions, suggestions, and recommendations provided by BranchWise are for reference and informational purposes only. While we try our best to ensure the reliability of our data, we do not guarantee actual admission. Ranks and seat allocation cutoffs can vary significantly between years. You are responsible for double-checking official JoSAA and CSAB portals during counseling.
              </p>

              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '10px' }}>3. User Authentication</h3>
              <p>
                Access to personalized features of BranchWise optionally allows signing in with your account. You are responsible for keeping your login credentials secure.
              </p>

              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '10px' }}>4. Acceptable Use</h3>
              <p>
                You agree not to copy, scrape, distribute, or modify any portion of the data, code, or services provided on this platform. Abuse of the AI endpoint or recommendation server is strictly prohibited.
              </p>

              <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', marginTop: '10px' }}>5. Limitation of Liability</h3>
              <p>
                BranchWise and its developers shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use of or inability to use this platform, including admission decisions or loss of choices.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
