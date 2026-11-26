import { useEffect, useState } from "react";
import api, { ApiError, getBackendCategory } from "./api";
import AuthModal from "./components/AuthModal";
import BrandMark from "./components/BrandMark";
import InterviewScreen from "./components/InterviewScreen";
import LegalPage from "./components/LegalPage";
import ProfileScreen from "./components/ProfileScreen";
import ResultsScreen from "./components/ResultsScreen";
import StatsModal from "./components/StatsModal";
import StudentReviewsScreen from "./components/StudentReviewsScreen";

const readSession = (key) => {
	try {
		const raw = sessionStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
};

const readSharedInputs = () => {
	try {
		const m = window.location.hash.match(/^#q=(.+)$/);
		if (m) return JSON.parse(decodeURIComponent(escape(atob(m[1]))));
		const saved = localStorage.getItem("deebo_inputs");
		return saved ? JSON.parse(saved) : null;
	} catch {
		return null;
	}
};

const encodeInputs = (inputs) => {
	const { rank, advRank, category, gender, homeState, qualifiedAdv, preferences } = inputs || {};
	return btoa(unescape(encodeURIComponent(JSON.stringify(
		{ rank, advRank, category, gender, homeState, qualifiedAdv, preferences },
	))));
};

const readUser = () => {
	const raw = localStorage.getItem("deebo_user");
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
};

const STEPS = [
	{ key: "profile", num: "01", label: "Profile", view: "form" },
	{ key: "index", num: "02", label: "Index", view: "results" },
	{ key: "reviews", num: "03", label: "Student Reviews", view: "reviews" },
];

export default function App() {
	const [view, setView] = useState(
		() => sessionStorage.getItem("bw_view") || "form",
	);
	const [previousView, setPreviousView] = useState(
		() => sessionStorage.getItem("bw_prev_view") || "form",
	);
	const [loading, setLoading] = useState(false);
	const [userInputs, setUserInputs] = useState(() =>
		readSharedInputs() || readSession("bw_userInputs"),
	);
	const [copied, setCopied] = useState(false);
	const copyShareLink = async () => {
		if (!userInputs) return;
		const url = `${window.location.origin}${window.location.pathname}#q=${encodeInputs(userInputs)}`;
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			window.location.hash = `q=${encodeInputs(userInputs)}`;
		}
	};
	const [results, setResults] = useState(() => readSession("bw_results"));
	const [questions, setQuestions] = useState(
		() => readSession("bw_questions") || [],
	);
	const [initialProfile, setInitialProfile] = useState(() =>
		readSession("bw_initialProfile"),
	);
	const [user, setUser] = useState(readUser);
	const [token, setToken] = useState(
		() => localStorage.getItem("deebo_token") || null,
	);
	const [showStats, setShowStats] = useState(false);
	const [showAuth, setShowAuth] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		sessionStorage.setItem("bw_view", view);
	}, [view]);

	useEffect(() => {
		sessionStorage.setItem("bw_prev_view", previousView);
	}, [previousView]);

	useEffect(() => {
		if (userInputs)
		{
			sessionStorage.setItem("bw_userInputs", JSON.stringify(userInputs));
			try {
				localStorage.setItem("deebo_inputs", JSON.stringify(userInputs));
			} catch {
				/* storage unavailable */
			}
		}
	}, [userInputs]);

	useEffect(() => {
		if (results) sessionStorage.setItem("bw_results", JSON.stringify(results));
	}, [results]);

	useEffect(() => {
		if (questions.length)
			sessionStorage.setItem("bw_questions", JSON.stringify(questions));
		else sessionStorage.removeItem("bw_questions");
	}, [questions]);

	useEffect(() => {
		if (initialProfile)
			sessionStorage.setItem(
				"bw_initialProfile",
				JSON.stringify(initialProfile),
			);
		else sessionStorage.removeItem("bw_initialProfile");
	}, [initialProfile]);

	const handleSignOut = () => {
		localStorage.removeItem("deebo_token");
		localStorage.removeItem("deebo_user");
		setToken(null);
		setUser(null);
		setError("");
	};

	const handleAuthSuccess = (data) => {
		setToken(data.access_token);
		setUser(data.user);
		localStorage.setItem("deebo_token", data.access_token);
		localStorage.setItem("deebo_user", JSON.stringify(data.user));
		setShowAuth(false);
	};

	const handleApiError = (err) => {
		if (err instanceof ApiError && err.status === 401) {
			handleSignOut();
			setError("Your session expired. Sign in again.");
			return;
		}
		setError(
			err instanceof ApiError
				? err.message
				: "Could not reach the service. Please try again.",
		);
	};

	const fetchRecommendations = async (inputs, profile) => {
		setLoading(true);
		try {
			const data = await api.recommend(
				{
					rank: inputs.rank,
					adv_rank: inputs.advRank || null,
					query: inputs.preferences,
					category: getBackendCategory(inputs.category, inputs.gender),
					homestate: inputs.homeState,
					exam_type: inputs.examType || "Mains",
					profile,
				},
				token,
			);
			setResults(data);
			setView("results");
		} catch (err) {
			handleApiError(err);
		} finally {
			setLoading(false);
		}
	};

	const handlePredict = async (inputs) => {
		setError("");
		setLoading(true);
		setUserInputs(inputs);

		try {
			const data = await api.generateQuestions(
				{ query: inputs.preferences, homestate: inputs.homeState },
				token,
			);

			if (data?.questions?.length) {
				setQuestions(data.questions);
				setInitialProfile(data.profile ?? null);
				setView("questionnaire");
			} else {
				await fetchRecommendations(inputs, data?.profile ?? null);
			}
		} catch (err) {
			handleApiError(err);
		} finally {
			setLoading(false);
		}
	};

	const handleQuestionnaireSubmit = (profile) => {
		fetchRecommendations(userInputs, profile);
	};

	const handleRefinePreferences = (text) => {
		const updated = { ...userInputs, preferences: text };
		setUserInputs(updated);
		fetchRecommendations(updated, null);
	};

	const openStats = () => setShowStats(true);
	const closeStats = () => setShowStats(false);
	const openAuth = () => setShowAuth(true);
	const closeAuth = () => setShowAuth(false);

	const navigate = (step) => {
		if (step === "profile") {
			setView("form");
			return;
		}
		if (step === "interview" && questions.length) {
			setView("questionnaire");
			return;
		}
		if (step === "index" && results) {
			setView("results");
			return;
		}
		if (step === "reviews") {
			setView("reviews");
			return;
		}
	};

	const showLegal = (type) => {
		if (view !== "privacy" && view !== "terms") setPreviousView(view);
		setView(type);
	};

	const stepAvailability = {
		profile: true,
		interview: questions.length > 0,
		index: Boolean(results),
		reviews: true,
	};

	const isLegal = view === "privacy" || view === "terms";
	const initial = (
		user?.profile?.display_name ||
		user?.name ||
		user?.username ||
		"S"
	)
		.trim()
		.charAt(0);
	const displayName =
		user?.profile?.display_name || user?.name || user?.username || "Student";

	const renderScreen = () => {
		if (isLegal) {
			return <LegalPage type={view} onBack={() => setView(previousView)} />;
		}
		if (view === "questionnaire" && questions.length) {
			return (
				<InterviewScreen
					questions={questions}
					initialProfile={initialProfile}
					onSubmit={handleQuestionnaireSubmit}
					onCancel={() => setView("form")}
					onSkipAll={() => handleQuestionnaireSubmit(initialProfile)}
				/>
			);
		}
		if (view === "results" && results) {
			return (
				<ResultsScreen
					results={results}
					userInputs={userInputs}
					token={token}
					onEdit={() => setView("form")}
					onRefinePreferences={handleRefinePreferences}
				/>
			);
		}
		if (view === "reviews") {
			return <StudentReviewsScreen user={user} token={token} />;
		}
		return (
			<ProfileScreen
				initialValues={userInputs}
				onSubmit={handlePredict}
				loading={loading}
			/>
		);
	};

	return (
		<div className="app-shell">
			<header className="topbar">
				<button
					type="button"
					className="topbar__brand"
					onClick={() => navigate("profile")}
					aria-label="Deebo's College, go to profile"
				>
					<BrandMark />
					<span className="wordmark">
						Deebo's College
						<span className="wordmark__sub">JoSAA index</span>
					</span>
				</button>

				<nav className="index-nav" aria-label="Search steps">
					{STEPS.map((step) => {
						const active = view === step.view;
						return (
							<button
								key={step.key}
								type="button"
								className={`index-nav__item${active ? " is-active" : ""}`}
								onClick={() => navigate(step.key)}
								disabled={!stepAvailability[step.key]}
								aria-current={active ? "step" : undefined}
							>
								<span className="index-nav__num">{step.num}</span>
								{step.label}
							</button>
						);
					})}
				</nav>

				<div className="topbar__actions">
					{userInputs ? (
						<button type="button" className="btn btn--text btn--sm" onClick={copyShareLink}>
							{copied ? "Link copied" : "Share"}
						</button>
					) : null}
					<button
						type="button"
						className="btn btn--text btn--sm"
						onClick={openStats}
					>
						Stats
					</button>
					{user ? (
						<div className="user-menu">
							<span className="avatar" aria-hidden="true">
								{initial}
							</span>
							<span className="user-menu__name">{displayName}</span>
							<button
								type="button"
								className="btn btn--text btn--sm"
								onClick={handleSignOut}
							>
								Sign out
							</button>
						</div>
					) : (
						<button
							type="button"
							className="btn btn--ghost btn--sm"
							onClick={openAuth}
						>
							Sign in
						</button>
					)}
				</div>
			</header>

			{error ? (
				<div className="error-banner" role="alert">
					<span>{error}</span>
					<button
						type="button"
						className="error-banner__dismiss"
						onClick={() => setError("")}
						aria-label="Dismiss message"
					>
						Dismiss
					</button>
				</div>
			) : null}

			<main className="main">
				{loading ? (
					<div className="loading-screen skeleton" aria-busy="true">
						<span className="sr-only">Matching your rank against the index...</span>
						{Array.from({ length: 6 }).map((_, i) => (
							<div className="skeleton__row" key={i} aria-hidden="true">
								<span className="skeleton__bar skeleton__bar--wide" />
								<span className="skeleton__bar" />
								<span className="skeleton__bar skeleton__bar--short" />
							</div>
						))}
					</div>
				) : (
					renderScreen()
				)}
			</main>

			<footer className="colophon">
				<span>Data: JoSAA 2024 Round 5 and 2025</span>
				<div className="colophon__links">
					<button
						type="button"
						className="btn btn--text btn--sm"
						onClick={() => showLegal("privacy")}
					>
						Privacy
					</button>
					<button
						type="button"
						className="btn btn--text btn--sm"
						onClick={() => showLegal("terms")}
					>
						Terms
					</button>
				</div>
				<span>Deebo's College</span>
			</footer>

			<AuthModal
				isOpen={showAuth}
				onClose={closeAuth}
				onSuccess={handleAuthSuccess}
			/>
			<StatsModal isOpen={showStats} onClose={closeStats} token={token} />
		</div>
	);
}
