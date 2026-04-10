import { Repository } from 'typeorm';
import { SurveyFamily } from '../../entities/survey-families.entity';
import { PublicSurvey } from '../../entities-public/survey.public.entity';
import { PublicSurveyQuestionMap } from '../../entities-public/survey-question-map.public.entity';

const FEEDBACK_WINDOW_DAYS = 7;

interface SurveyActionableRepos {
  surveysRepo: Repository<PublicSurvey>;
  questionMapRepo: Repository<PublicSurveyQuestionMap>;
}

/**
 * Determines whether a survey_family record represents an actionable survey
 * that should be surfaced to the user (e.g. for a "Give Feedback" button).
 *
 * Returns false when the survey is:
 * - Already completed/submitted
 * - Expired (presented_at + 7 days has passed, unless in_progress)
 * - Not yet available (now < presented_at)
 * - Deactivated (survey.status_id !== 1)
 * - Empty (no active questions mapped)
 */
export async function isSurveyActionable(
  fam: SurveyFamily,
  repos: SurveyActionableRepos,
): Promise<boolean> {
  if (fam.survey_status === 'completed' || fam.survey_status === 'expired') return false;

  if (fam.presented_at && fam.survey_status !== 'in_progress') {
    const now = new Date();
    const presentedAt = new Date(fam.presented_at.valueOf());
    const expiresAt = new Date(presentedAt.getTime());
    expiresAt.setDate(expiresAt.getDate() + FEEDBACK_WINDOW_DAYS);
    if (now < presentedAt || now > expiresAt) return false;
  }

  const survey = await repos.surveysRepo.findOne({
    where: { survey_id: fam.survey_id },
  });
  if (!survey || survey.status_id !== 1) return false;

  const questionCount = await repos.questionMapRepo.count({
    where: { survey_id: fam.survey_id, status_id: 1 },
  });
  if (questionCount === 0) return false;

  return true;
}
