import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { SurveysService } from '../surveys.service';
import { SurveyFamily } from '../../../entities/survey-families.entity';
import { SurveyFamilyAnswer } from '../../../entities/survey-family-answers.entity';
import { PublicSurvey } from '../../../entities-public/survey.public.entity';
import { PublicSurveyQuestionLibrary } from '../../../entities-public/survey-question-library.public.entity';
import { PublicSurveyAnswerLibrary } from '../../../entities-public/survey-answer-library.public.entity';
import { PublicSurveyQuestionMap } from '../../../entities-public/survey-question-map.public.entity';
import { PublicAnswerType } from '../../../entities-public/types-answer.public.entity';
import { PublicSurveySkipLogic } from '../../../entities-public/survey-skip-logic.public.entity';
import { Registration } from '../../../entities/registration.entity';
import { Authentication } from '../../../entities/authentication.entity';
import { UsersService } from '../../users/users.service';
import { HouseholdsService } from '../../households/households.service';
import { PublicScheduleService } from '../../public-schedule/public-schedule.service';
import { FEEDBACK_SURVEY_TYPE_ID } from '../../../common/constants/survey.constants';

function createRepoMock<T extends ObjectLiteral>(): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findBy: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
    delete: jest.fn(),
    insert: jest.fn(),
    upsert: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as any;
}

function createQbMock(result: any = null) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
    getMany: jest.fn().mockResolvedValue(result != null ? [result] : []),
  };
  return qb;
}

describe('SurveysService', () => {
  let service: SurveysService;
  let surveysRepo: jest.Mocked<Repository<PublicSurvey>>;
  let familiesRepo: jest.Mocked<Repository<SurveyFamily>>;
  let regsRepo: jest.Mocked<Repository<Registration>>;
  let authRepo: jest.Mocked<Repository<Authentication>>;
  let questionMapRepo: jest.Mocked<Repository<PublicSurveyQuestionMap>>;
  let questionsLibRepo: jest.Mocked<Repository<PublicSurveyQuestionLibrary>>;
  let answersLibRepo: jest.Mocked<Repository<PublicSurveyAnswerLibrary>>;
  let answerTypesRepo: jest.Mocked<Repository<PublicAnswerType>>;
  let householdsService: jest.Mocked<HouseholdsService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SurveysService,
        { provide: getRepositoryToken(SurveyFamily), useValue: createRepoMock<SurveyFamily>() },
        {
          provide: getRepositoryToken(SurveyFamilyAnswer),
          useValue: createRepoMock<SurveyFamilyAnswer>(),
        },
        { provide: getRepositoryToken(PublicSurvey), useValue: createRepoMock<PublicSurvey>() },
        {
          provide: getRepositoryToken(PublicSurveyQuestionLibrary),
          useValue: createRepoMock<PublicSurveyQuestionLibrary>(),
        },
        {
          provide: getRepositoryToken(PublicSurveyAnswerLibrary),
          useValue: createRepoMock<PublicSurveyAnswerLibrary>(),
        },
        {
          provide: getRepositoryToken(PublicSurveyQuestionMap),
          useValue: createRepoMock<PublicSurveyQuestionMap>(),
        },
        {
          provide: getRepositoryToken(PublicAnswerType),
          useValue: createRepoMock<PublicAnswerType>(),
        },
        {
          provide: getRepositoryToken(PublicSurveySkipLogic),
          useValue: createRepoMock<PublicSurveySkipLogic>(),
        },
        { provide: getRepositoryToken(Registration), useValue: createRepoMock<Registration>() },
        { provide: getRepositoryToken(Authentication), useValue: createRepoMock<Authentication>() },
        {
          provide: UsersService,
          useValue: { findDbUserIdByCognitoUuid: jest.fn() } as any,
        },
        {
          provide: HouseholdsService,
          useValue: { findHouseholdIdByUserId: jest.fn() } as any,
        },
        {
          provide: PublicScheduleService,
          useValue: {} as any,
        },
      ],
    }).compile();

    service = moduleRef.get(SurveysService);
    surveysRepo = moduleRef.get(getRepositoryToken(PublicSurvey));
    familiesRepo = moduleRef.get(getRepositoryToken(SurveyFamily));
    regsRepo = moduleRef.get(getRepositoryToken(Registration));
    authRepo = moduleRef.get(getRepositoryToken(Authentication));
    questionMapRepo = moduleRef.get(getRepositoryToken(PublicSurveyQuestionMap));
    questionsLibRepo = moduleRef.get(getRepositoryToken(PublicSurveyQuestionLibrary));
    answersLibRepo = moduleRef.get(getRepositoryToken(PublicSurveyAnswerLibrary));
    answerTypesRepo = moduleRef.get(getRepositoryToken(PublicAnswerType));
    householdsService = moduleRef.get(HouseholdsService);
  });

  function setupOwnershipMocks() {
    authRepo.findOne.mockResolvedValue({ user_id: 10 } as any);
    (householdsService.findHouseholdIdByUserId as jest.Mock).mockResolvedValue(20);
    regsRepo.findOne.mockResolvedValue({ id: 1, household_id: 20 } as any);
  }

  function setupEmptyFamilyAndQuestions() {
    familiesRepo.findOne.mockResolvedValue(null as any);
    questionMapRepo.find.mockResolvedValue([]);
  }

  describe('fetchLatestActiveSurveyCompat (via getActive)', () => {
    const user = { authType: 'guest' as const, dbUserId: 10 };
    const registrationId = 1;

    it('returns feedback survey even when a higher-id PRAPARE survey exists for the same language', async () => {
      setupOwnershipMocks();
      setupEmptyFamilyAndQuestions();

      const feedbackSurvey = {
        survey_id: 9,
        parent_survey_id: 8,
        language_id: 2,
        survey_type_id: FEEDBACK_SURVEY_TYPE_ID,
        survey_title: 'Comentarios Después del Evento',
        status_id: 1,
      };

      const languageQb = createQbMock(feedbackSurvey);
      const logicalQb = createQbMock(feedbackSurvey);

      surveysRepo.createQueryBuilder.mockReturnValueOnce(languageQb).mockReturnValueOnce(logicalQb);
      surveysRepo.findOne.mockResolvedValue(feedbackSurvey as any);

      const result = await service.getActive({
        user,
        registrationId,
        languageId: 2,
      });

      expect(result.has_active).toBe(true);
      expect((result as any).survey.id).toBe(9);

      expect(languageQb.andWhere).toHaveBeenCalledWith('s.survey_type_id = :type', {
        type: FEEDBACK_SURVEY_TYPE_ID,
      });
    });

    it('falls back to English feedback survey when requested language has no active feedback survey', async () => {
      setupOwnershipMocks();
      setupEmptyFamilyAndQuestions();

      const englishFeedback = {
        survey_id: 8,
        parent_survey_id: null,
        language_id: 1,
        survey_type_id: FEEDBACK_SURVEY_TYPE_ID,
        survey_title: 'Post-Event Feedback',
        status_id: 1,
      };

      const languageQb = createQbMock(null);
      const fallbackQb = createQbMock(englishFeedback);
      const logicalQb = createQbMock(englishFeedback);

      surveysRepo.createQueryBuilder
        .mockReturnValueOnce(languageQb)
        .mockReturnValueOnce(fallbackQb)
        .mockReturnValueOnce(logicalQb);
      surveysRepo.findOne.mockResolvedValue(englishFeedback as any);

      const result = await service.getActive({
        user,
        registrationId,
        languageId: 4,
      });

      expect(result.has_active).toBe(true);
      expect((result as any).survey.id).toBe(8);

      expect(languageQb.andWhere).toHaveBeenCalledWith('s.language_id = :lang', { lang: 4 });
      expect(languageQb.andWhere).toHaveBeenCalledWith('s.survey_type_id = :type', {
        type: FEEDBACK_SURVEY_TYPE_ID,
      });

      expect(fallbackQb.andWhere).toHaveBeenCalledWith('s.language_id = :lang', { lang: 1 });
      expect(fallbackQb.andWhere).toHaveBeenCalledWith('s.survey_type_id = :type', {
        type: FEEDBACK_SURVEY_TYPE_ID,
      });
    });

    it('returns has_active false when no active feedback surveys exist', async () => {
      setupOwnershipMocks();

      const languageQb = createQbMock(null);
      const fallbackQb = createQbMock(null);

      surveysRepo.createQueryBuilder
        .mockReturnValueOnce(languageQb)
        .mockReturnValueOnce(fallbackQb);

      const result = await service.getActive({
        user,
        registrationId,
        languageId: 99,
      });

      expect(result.has_active).toBe(false);
    });

    it('skips language-specific query and uses English fallback when languageId is undefined', async () => {
      setupOwnershipMocks();
      setupEmptyFamilyAndQuestions();

      const englishFeedback = {
        survey_id: 8,
        parent_survey_id: null,
        language_id: 1,
        survey_type_id: FEEDBACK_SURVEY_TYPE_ID,
        survey_title: 'Post-Event Feedback',
        status_id: 1,
      };

      const fallbackQb = createQbMock(englishFeedback);
      const logicalQb = createQbMock(englishFeedback);

      surveysRepo.createQueryBuilder.mockReturnValueOnce(fallbackQb).mockReturnValueOnce(logicalQb);
      surveysRepo.findOne.mockResolvedValue(englishFeedback as any);

      const result = await service.getActive({
        user,
        registrationId,
      });

      expect(result.has_active).toBe(true);
      expect((result as any).survey.id).toBe(8);

      expect(surveysRepo.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(fallbackQb.andWhere).toHaveBeenCalledWith('s.language_id = :lang', { lang: 1 });
      expect(fallbackQb.andWhere).toHaveBeenCalledWith('s.survey_type_id = :type', {
        type: FEEDBACK_SURVEY_TYPE_ID,
      });
    });
  });
});
