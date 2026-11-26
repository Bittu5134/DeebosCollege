import {
	BarChart2,
	BookOpen,
	Building,
	CheckCircle2,
	Code2,
	Coffee,
	Compass,
	ExternalLink,
	Filter,
	Info,
	MessageSquare,
	PlusCircle,
	Scale,
	Sparkles,
	ThumbsUp,
	Users,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import SearchableSelect from "./ui/SearchableSelect";
import "./ui/searchable-select.css";
import "./reviews.css";

const TOPIC_ICONS = {
	hostel: Building,
	food: Coffee,
	academics: BookOpen,
	"coding culture": Code2,
	clubs: Users,
	"campus life": Compass,
};

const TOPICS = [
	"hostel",
	"food",
	"academics",
	"coding culture",
	"clubs",
	"campus life",
];

export default function StudentReviewsScreen({ user, token }) {
	const [collegesList, setCollegesList] = useState([]);
	const [selectedCollegeId, setSelectedCollegeId] = useState("");
	const [collegeData, setCollegeData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [selectedTopic, setSelectedTopic] = useState("");
	const [sortBy, setSortBy] = useState("recent");
	const [mode, setMode] = useState("browse"); // 'browse' or 'compare'

	// Compare Mode State
	const [compareIdA, setCompareIdA] = useState("");
	const [compareIdB, setCompareIdB] = useState("");
	const [comparisonResult, setComparisonResult] = useState(null);
	const [comparingLoading, setComparingLoading] = useState(false);

	// Review Submission Modal State
	const [showSubmitModal, setShowSubmitModal] = useState(false);
	const [submitSuccessMsg, setSubmitSuccessMsg] = useState("");
	const [votedMap, setVotedMap] = useState({});

	const collegeOptions = useMemo(() => {
		return collegesList.map((c) => ({
			value: String(c.college_id),
			label: c.college_name,
			sublabel: `${c.total_reviews} reviews • Score: ${c.overall_score ? `${c.overall_score.toFixed(1)}/5.0` : "New"}`,
		}));
	}, [collegesList]);

	// Fetch initial colleges
	useEffect(() => {
		let isMounted = true;
		async function loadColleges() {
			try {
				setLoading(true);
				const data = await api.listCollegesWithReviews();
				if (isMounted && data?.colleges?.length) {
					setCollegesList(data.colleges);
					setSelectedCollegeId(String(data.colleges[0].college_id));
					setCompareIdA(String(data.colleges[0].college_id));
					if (data.colleges.length > 1) {
						setCompareIdB(String(data.colleges[1].college_id));
					}
				}
			} catch (err) {
				console.error("Failed to load review colleges:", err);
			} finally {
				if (isMounted) setLoading(false);
			}
		}
		loadColleges();
		return () => {
			isMounted = false;
		};
	}, []);

	// Fetch selected college details
	useEffect(() => {
		if (!selectedCollegeId) return;
		let isMounted = true;
		async function fetchDetails() {
			try {
				const data = await api.getCollegeReviews(selectedCollegeId, {
					topic: selectedTopic || undefined,
					sort_by: sortBy,
				});
				if (isMounted) {
					setCollegeData(data);
				}
			} catch (err) {
				console.error("Failed to load college reviews:", err);
			}
		}
		fetchDetails();
		return () => {
			isMounted = false;
		};
	}, [selectedCollegeId, selectedTopic, sortBy]);

	// Handle comparison fetch
	useEffect(() => {
		if (mode !== "compare" || !compareIdA || !compareIdB) return;
		let isMounted = true;
		async function fetchCompare() {
			try {
				setComparingLoading(true);
				const data = await api.compareColleges(compareIdA, compareIdB);
				if (isMounted) {
					setComparisonResult(data);
				}
			} catch (err) {
				console.error("Failed to load college comparison:", err);
			} finally {
				if (isMounted) setComparingLoading(false);
			}
		}
		fetchCompare();
		return () => {
			isMounted = false;
		};
	}, [mode, compareIdA, compareIdB]);

	const handleVote = async (reviewId) => {
		if (votedMap[reviewId]) return;
		try {
			const userIdentifier =
				user?.user_id || user?.alpha_id ||
				localStorage.getItem("ci_user_uid") ||
				`anon_${Math.random().toString(36).substring(2, 9)}`;
			localStorage.setItem("ci_user_uid", userIdentifier);
			const res = await api.voteReviewHelpful(reviewId, userIdentifier);
			setVotedMap((prev) => ({ ...prev, [reviewId]: true }));
			// Update local review state
			if (collegeData?.reviews) {
				setCollegeData({
					...collegeData,
					reviews: collegeData.reviews.map((r) =>
						r.id === reviewId ? { ...r, helpful_votes: res.helpful_votes } : r,
					),
				});
			}
		} catch (err) {
			console.error("Vote failed:", err);
		}
	};

	const getScoreBadgeClass = (score) => {
		if (!score) return "score-badge--mixed";
		if (score >= 4.5) return "score-badge--exceptional";
		if (score >= 3.8) return "score-badge--positive";
		if (score >= 3.0) return "score-badge--satisfactory";
		return "score-badge--mixed";
	};

	const getMeterColor = (score) => {
		if (!score) return "#94a3b8";
		if (score >= 4.5) return "#34d399"; // Emerald
		if (score >= 3.8) return "#38bdf8"; // Sky blue
		if (score >= 3.0) return "#fbbf24"; // Amber
		return "#f87171"; // Rose
	};

	return (
		<div className="reviews-screen">
			{/* Top Header */}
			<header className="reviews-header">
				<div className="reviews-header__badge-row">
					<span className="reviews-pill">
						<Sparkles size={13} />
						Campus Insider Plugin
					</span>
				</div>
				<h1 className="reviews-header__title">
					Student Reviews & Campus Insider Plugin
				</h1>
			</header>

			{/* Mode Controls Bar */}
			<div className="reviews-controls-bar">
				<div className="reviews-tabs" role="tablist" aria-label="Review Views">
					<button
						type="button"
						role="tab"
						aria-selected={mode === "browse"}
						className={`reviews-tab-btn ${mode === "browse" ? "is-active" : ""}`}
						onClick={() => setMode("browse")}
					>
						<BarChart2 size={14} />
						College Breakdown & Reviews
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={mode === "compare"}
						className={`reviews-tab-btn ${mode === "compare" ? "is-active" : ""}`}
						onClick={() => setMode("compare")}
					>
						<Scale size={14} />
						Side-by-Side Comparison
					</button>
				</div>

				<button
					type="button"
					className="btn btn--primary btn--sm"
					onClick={() => {
						setSubmitSuccessMsg("");
						setShowSubmitModal(true);
					}}
				>
					<PlusCircle size={14} />
					Write a Review
				</button>
			</div>

			{mode === "browse" ? (
				<>
					{/* Filters & College Selector */}
					<div className="reviews-selector-row">
						<SearchableSelect
							id="college-select"
							label="Select College:"
							options={collegeOptions}
							value={selectedCollegeId}
							onChange={(val) => setSelectedCollegeId(val)}
							placeholder="Search or choose college..."
							searchPlaceholder="Type college name (e.g., IIT Bombay, NIT Trichy)..."
						/>

						<div className="reviews-select-group" style={{ marginTop: "19px" }}>
							<label htmlFor="topic-filter">Topic:</label>
							<select
								id="topic-filter"
								className="reviews-select"
								value={selectedTopic}
								onChange={(e) => setSelectedTopic(e.target.value)}
							>
								<option value="">All Topics</option>
								{TOPICS.map((t) => (
									<option key={t} value={t}>
										{t.charAt(0).toUpperCase() + t.slice(1)}
									</option>
								))}
							</select>
						</div>

						<div className="reviews-select-group" style={{ marginTop: "19px" }}>
							<label htmlFor="sort-select">Sort By:</label>
							<select
								id="sort-select"
								className="reviews-select"
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value)}
							>
								<option value="recent">Most Recent</option>
								<option value="helpful">Most Helpful Votes</option>
								<option value="rating">Highest Rated</option>
							</select>
						</div>
					</div>

					{/* Radar / Topic Breakdown Cards */}
					{collegeData?.summary?.topic_breakdown ? (
						<div className="radar-grid" aria-label="Topic Breakdown Ratings">
							{TOPICS.map((t) => {
								const metric = collegeData.summary.topic_breakdown[t] || {};
								const Icon = TOPIC_ICONS[t] || Building;
								const score = metric.score;
								const scorePercent = score ? (score / 5.0) * 100 : 0;
								return (
									<div key={t} className="topic-metric-card">
										<div className="topic-metric-card__header">
											<div className="topic-metric-card__title">
												<Icon size={16} />
												<span>{t}</span>
											</div>
											<span
												className={`topic-metric-card__score-badge ${getScoreBadgeClass(score)}`}
											>
												{score !== null
													? `${score.toFixed(1)} / 5.0`
													: "No data"}
											</span>
										</div>

										<div className="topic-meter">
											<div className="topic-meter__track" aria-hidden="true">
												<div
													className="topic-meter__fill"
													style={{
														width: `${scorePercent}%`,
														backgroundColor: getMeterColor(score),
													}}
												/>
											</div>
											<div className="topic-meter__ticks">
												<span>Label: {metric.label}</span>
												<span>
													{metric.review_count} review
													{metric.review_count === 1 ? "" : "s"}
												</span>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					) : null}

					{/* Reviews List */}
					<section className="reviews-feed" aria-label="Student reviews feed">
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<h2
								style={{
									fontSize: "16px",
									fontFamily: "var(--mono)",
									margin: 0,
								}}
							>
								Student Perspectives ({collegeData?.reviews?.length || 0})
							</h2>
						</div>

						{collegeData?.reviews?.length === 0 ? (
							<div
								style={{
									padding: "32px",
									textAlign: "center",
									color: "var(--muted)",
									fontFamily: "var(--mono)",
								}}
							>
								No reviews found for this topic filter. Be the first to submit a
								review!
							</div>
						) : (
							collegeData?.reviews?.map((rev) => {
								const isSample = Boolean(rev.is_sample_data);
								const hasVoted = Boolean(votedMap[rev.id]);
								const authorInitial = (rev.reviewer_name || "S")
									.charAt(0)
									.toUpperCase();
								const tags = rev.detected_topics
									? rev.detected_topics.split(",").filter(Boolean)
									: [];

								return (
									<article key={rev.id} className="review-card">
										<div className="review-card__top">
											<div className="review-card__author">
												<div
													className="review-author-avatar"
													aria-hidden="true"
												>
													{authorInitial}
												</div>
												<div>
													<span className="review-author-name">
														{rev.reviewer_name}
													</span>{" "}
													<span className="review-role-badge">
														{rev.reviewer_role}
													</span>
													{rev.batch_year ? (
														<span
															style={{
																fontSize: "11px",
																color: "var(--muted)",
																marginLeft: "6px",
															}}
														>
															Batch '{String(rev.batch_year).slice(-2)}
														</span>
													) : null}
												</div>
											</div>

											<div>
												<span className="review-provenance-tag review-provenance-tag--verified">
													<CheckCircle2 size={11} />
													{rev.source_platform || "Verified Student Review"}
												</span>
											</div>
										</div>

										<p className="review-card__text">{rev.review_text}</p>

										{tags.length > 0 ? (
											<div className="review-card__tags">
												{tags.map((tg) => (
													<span key={tg} className="review-topic-tag">
														#{tg}
													</span>
												))}
											</div>
										) : null}

										<div className="review-card__footer">
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "12px",
												}}
											>
												<span>
													Overall Rating:{" "}
													<strong>
														{rev.overall_rating
															? rev.overall_rating.toFixed(1)
															: "—"}{" "}
														/ 5.0
													</strong>
												</span>
												{rev.source_link ? (
													<a
														href={rev.source_link}
														target="_blank"
														rel="noopener noreferrer"
														style={{
															display: "inline-flex",
															alignItems: "center",
															gap: "4px",
															color: "#38bdf8",
														}}
													>
														<ExternalLink size={11} />
														View on {rev.source_platform || "Portal"}
													</a>
												) : null}
											</div>

											<button
												type="button"
												className="review-vote-btn"
												onClick={() => handleVote(rev.id)}
												disabled={hasVoted}
												title="Mark this review as helpful (weights into college score)"
											>
												<ThumbsUp size={12} />
												<span>Helpful ({rev.helpful_votes || 0})</span>
											</button>
										</div>
									</article>
								);
							})
						)}
					</section>
				</>
			) : (
				/* Compare Mode */
				<div className="compare-container">
					<div className="compare-selectors-bar">
						<div>
							<SearchableSelect
								id="compare-a"
								label="College A:"
								options={collegeOptions}
								value={compareIdA}
								onChange={(val) => setCompareIdA(val)}
								placeholder="Search College A..."
								searchPlaceholder="Search first college..."
							/>
						</div>

						<div className="compare-vs-badge" style={{ marginTop: "16px" }}>
							VS
						</div>

						<div>
							<SearchableSelect
								id="compare-b"
								label="College B:"
								options={collegeOptions}
								value={compareIdB}
								onChange={(val) => setCompareIdB(val)}
								placeholder="Search College B..."
								searchPlaceholder="Search second college..."
							/>
						</div>
					</div>

					{comparingLoading ? (
						<div
							style={{
								textAlign: "center",
								padding: "40px",
								color: "var(--muted)",
								fontFamily: "var(--mono)",
							}}
						>
							Computing weighted student comparison scores...
						</div>
					) : comparisonResult ? (
						<div style={{ overflowX: "auto" }}>
							<table
								className="compare-table"
								aria-label="College side by side comparison table"
							>
								<thead>
									<tr>
										<th>Review Topic</th>
										<th>{comparisonResult.college_a?.college_name}</th>
										<th>{comparisonResult.college_b?.college_name}</th>
										<th>Student Consensus</th>
									</tr>
								</thead>
								<tbody>
									{comparisonResult.topics_comparison?.map((row) => (
										<tr key={row.topic}>
											<td
												style={{ textTransform: "capitalize", fontWeight: 600 }}
											>
												{row.topic}
											</td>
											<td>
												<span style={{ fontWeight: 700, color: "#38bdf8" }}>
													{row.college_a_score
														? `${row.college_a_score.toFixed(1)} / 5.0`
														: "No data"}
												</span>{" "}
												<span
													style={{ fontSize: "11px", color: "var(--muted)" }}
												>
													({row.college_a_label})
												</span>
											</td>
											<td>
												<span style={{ fontWeight: 700, color: "#fbbf24" }}>
													{row.college_b_score
														? `${row.college_b_score.toFixed(1)} / 5.0`
														: "No data"}
												</span>{" "}
												<span
													style={{ fontSize: "11px", color: "var(--muted)" }}
												>
													({row.college_b_label})
												</span>
											</td>
											<td>
												{row.advantage === "A" ? (
													<span className="compare-advantage-tag compare-advantage-tag--a">
														Favors College A (+{row.difference})
													</span>
												) : row.advantage === "B" ? (
													<span className="compare-advantage-tag compare-advantage-tag--b">
														Favors College B (+{Math.abs(row.difference)})
													</span>
												) : (
													<span className="compare-advantage-tag compare-advantage-tag--tie">
														Equal Consensus
													</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : null}
				</div>
			)}

			{/* Review Submission Modal */}
			{showSubmitModal && (
				<SubmitReviewModal
					collegesList={collegesList}
					defaultCollegeId={selectedCollegeId}
					onClose={() => setShowSubmitModal(false)}
					onSuccess={(res) => {
						setSubmitSuccessMsg(
							"Your review was successfully submitted and weighed into the topic scores!",
						);
						// Refresh college data
						api
							.getCollegeReviews(selectedCollegeId)
							.then(setCollegeData)
							.catch(console.error);
					}}
				/>
			)}
		</div>
	);
}

function SubmitReviewModal({
	collegesList,
	defaultCollegeId,
	onClose,
	onSuccess,
}) {
	const [collegeId, setCollegeId] = useState(
		defaultCollegeId || collegesList[0]?.college_id || "",
	);
	const [reviewerRole, setReviewerRole] = useState("Current Student");
	const [reviewerName, setReviewerName] = useState("");
	const [batchYear, setBatchYear] = useState("2026");
	const [reviewText, setReviewText] = useState("");
	const [ratings, setRatings] = useState({
		hostel: 4,
		food: 3,
		academics: 4,
		coding_culture: 4,
		clubs: 4,
		campus_life: 4,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");

	const selectedCol = collegesList.find(
		(c) => String(c.college_id) === String(collegeId),
	);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (reviewText.trim().length < 15) {
			setError(
				"Please provide at least 15 characters of detailed review feedback.",
			);
			return;
		}
		setError("");
		setIsSubmitting(true);
		try {
			const payload = {
				college_id: Number(collegeId),
				college_name: selectedCol
					? selectedCol.college_name
					: "Unknown College",
				reviewer_role: reviewerRole,
				reviewer_name: reviewerName.trim() || "Anonymous Student",
				batch_year: Number(batchYear) || null,
				review_text: reviewText.trim(),
				rating_hostel: ratings.hostel,
				rating_food: ratings.food,
				rating_academics: ratings.academics,
				rating_coding_culture: ratings.coding_culture,
				rating_clubs: ratings.clubs,
				rating_campus_life: ratings.campus_life,
				source_platform: "Platform Submission",
			};
			const res = await api.submitReview(payload);
			onSuccess(res);
			onClose();
		} catch (err) {
			setError(err?.message || "Failed to submit review.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="review-modal-backdrop" onClick={onClose}>
			<div
				className="review-modal"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
			>
				<div className="review-modal__head">
					<h2
						style={{ fontSize: "16px", fontFamily: "var(--mono)", margin: 0 }}
					>
						Submit Student Review (Campus Insider)
					</h2>
					<button
						type="button"
						className="btn btn--text btn--sm"
						onClick={onClose}
						aria-label="Close"
					>
						<X size={16} />
					</button>
				</div>

				{error && (
					<div
						style={{
							color: "#f87171",
							fontSize: "12px",
							fontFamily: "var(--mono)",
						}}
					>
						{error}
					</div>
				)}

				<form
					onSubmit={handleSubmit}
					style={{ display: "flex", flexDirection: "column", gap: "16px" }}
				>
					<div>
						<SearchableSelect
							id="submit-college-select"
							label="Select College"
							options={collegesList.map((c) => ({
								value: String(c.college_id),
								label: c.college_name,
							}))}
							value={collegeId}
							onChange={(val) => setCollegeId(val)}
							placeholder="Search or pick college..."
							searchPlaceholder="Type college name..."
						/>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "12px",
						}}
					>
						<div>
							<label
								style={{
									display: "block",
									fontSize: "12px",
									fontFamily: "var(--mono)",
									marginBottom: "4px",
								}}
							>
								Your Status
							</label>
							<select
								className="reviews-select"
								style={{ width: "100%", maxWidth: "100%" }}
								value={reviewerRole}
								onChange={(e) => setReviewerRole(e.target.value)}
							>
								<option value="Current Student">Current Student</option>
								<option value="Senior">Senior</option>
								<option value="Alum">Alum</option>
								<option value="Aspirant">Aspirant</option>
							</select>
						</div>
						<div>
							<label
								style={{
									display: "block",
									fontSize: "12px",
									fontFamily: "var(--mono)",
									marginBottom: "4px",
								}}
							>
								Batch Year
							</label>
							<input
								type="number"
								className="reviews-select"
								style={{ width: "100%", maxWidth: "100%" }}
								value={batchYear}
								onChange={(e) => setBatchYear(e.target.value)}
								placeholder="2026"
							/>
						</div>
					</div>

					<div>
						<label
							style={{
								display: "block",
								fontSize: "12px",
								fontFamily: "var(--mono)",
								marginBottom: "4px",
							}}
						>
							Your Name / Alias
						</label>
						<input
							type="text"
							className="reviews-select"
							style={{ width: "100%", maxWidth: "100%" }}
							value={reviewerName}
							onChange={(e) => setReviewerName(e.target.value)}
							placeholder="e.g. 3rd Year CSE or Anonymous"
						/>
					</div>

					<div>
						<label
							style={{
								display: "block",
								fontSize: "12px",
								fontFamily: "var(--mono)",
								marginBottom: "4px",
							}}
						>
							Topic Ratings (1 - 5 Stars)
						</label>
						<div className="review-ratings-grid">
							{TOPICS.map((topic) => {
								const key = topic.replace(" ", "_");
								return (
									<div key={topic} className="review-rating-slider">
										<label>
											<span>{topic}:</span> <strong>{ratings[key]} / 5</strong>
										</label>
										<input
											type="range"
											min="1"
											max="5"
											step="0.5"
											value={ratings[key]}
											onChange={(e) =>
												setRatings({
													...ratings,
													[key]: parseFloat(e.target.value),
												})
											}
										/>
									</div>
								);
							})}
						</div>
					</div>

					<div>
						<label
							style={{
								display: "block",
								fontSize: "12px",
								fontFamily: "var(--mono)",
								marginBottom: "4px",
							}}
						>
							Detailed Review Experience
						</label>
						<textarea
							className="reviews-select"
							style={{ width: "100%", maxWidth: "100%", minHeight: "90px" }}
							value={reviewText}
							onChange={(e) => setReviewText(e.target.value)}
							placeholder="Describe hostels, mess food quality, professors, coding contests, clubs, and overall vibe..."
						/>
					</div>

					<div
						style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}
					>
						<button
							type="button"
							className="btn btn--text btn--sm"
							onClick={onClose}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="btn btn--primary btn--sm"
							disabled={isSubmitting}
						>
							{isSubmitting ? "Submitting..." : "Submit Review"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
