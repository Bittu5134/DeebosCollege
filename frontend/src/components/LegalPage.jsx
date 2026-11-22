import { ArrowLeft } from 'lucide-react';
import './legal.css';

const CONTENT = {
  privacy: {
    title: 'Privacy Policy',
    intro:
      "Welcome to Deebo's College, an AI-powered college predictor tool. We respect your privacy and are committed to protecting the information you share with us. This Privacy Policy explains how we collect, use, and safeguard your data.",
    sections: [
      {
        num: '01',
        heading: 'Information We Collect',
        body: [
          'We collect information that you explicitly provide when using our predictor tool, including:',
        ],
        list: [
          'Academic Details: Ranks (JEE Main, JEE Advanced), home state, category, and gender.',
          'Preferences: Academic and campus preferences (such as interest in coding culture, research, startups, or placements).',
          'Account Information: Account identifiers and email when you create an account or sign in.',
        ],
      },
      {
        num: '02',
        heading: 'How We Use Your Information',
        body: ['The information collected is used for the following purposes:'],
        list: [
          'To perform similarity queries on our database and provide college and branch recommendations.',
          'To generate personalized, context-specific counselor explanations using AI.',
          'To monitor and maintain search statistics to optimize our services.',
        ],
      },
      {
        num: '03',
        heading: 'Data Storage and Security',
        body: [
          'We prioritize the security of your data. Your preferences and information are securely processed and stored. We do not sell or lease your personal information to third parties.',
        ],
      },
      {
        num: '04',
        heading: 'AI and Third-Party API Services',
        body: [
          'Our recommendation explanations are generated using a third-party language model provider. Academic preferences and criteria are passed to the provider to produce descriptions. No account name or email is sent with that request.',
        ],
      },
      {
        num: '05',
        heading: 'Contact Us',
        body: [
          'If you have questions about this policy, contact the project maintainer through the repository.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms and Conditions',
    intro:
      "Please read these Terms and Conditions carefully before using the Deebo's College predictor. By accessing or using our services, you agree to be bound by these terms.",
    sections: [
      {
        num: '01',
        heading: 'Description of Service',
        body: [
          "Deebo's College provides college eligibility and branch predictions based on historical JoSAA and CSAB opening and closing ranks. It utilizes a retrieval system and an AI layer to offer customized counselor explanations.",
        ],
      },
      {
        num: '02',
        heading: 'Disclaimer of Accuracy',
        body: [
          "The predictions, suggestions, and recommendations provided by Deebo's College are for reference and informational purposes only. While we try our best to ensure the reliability of our data, we do not guarantee actual admission. Ranks and seat allocation cutoffs can vary significantly between years. You are responsible for double-checking official JoSAA and CSAB portals during counseling.",
        ],
      },
      {
        num: '03',
        heading: 'User Authentication',
        body: [
          'Sign-in is a demo session. Any email creates a local token. There is no password and no identity provider, so do not treat it as a real account.',
        ],
      },
      {
        num: '04',
        heading: 'Acceptable Use',
        body: [
          'You agree not to copy, scrape, distribute, or modify any portion of the data, code, or services provided on this platform. Abuse of the AI endpoint or recommendation server is strictly prohibited.',
        ],
      },
      {
        num: '05',
        heading: 'Limitation of Liability',
        body: [
          "Deebo's College and its developers shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use of or inability to use this platform, including admission decisions or loss of choices.",
        ],
      },
    ],
  },
};

export default function LegalPage({ type, onBack }) {
  const content = CONTENT[type] ?? CONTENT.privacy;

  return (
    <article className="legal" aria-labelledby="legal-title">
      <div className="legal__head">
        <button type="button" className="btn btn--text btn--sm legal__back" onClick={onBack}>
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          Back
        </button>
      </div>

      <div className="legal__body">
        <p className="legal__updated">Last updated: June 7, 2026</p>
        <h1 className="legal__title" id="legal-title">
          {content.title}
        </h1>
        <p className="legal__lede">{content.intro}</p>

        {content.sections.map((section) => (
          <section className="legal__section" key={section.num}>
            <p className="legal__num">{section.num}</p>
            <h2 className="legal__heading">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.list ? (
              <ul className="legal__list">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}
