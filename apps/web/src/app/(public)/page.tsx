import { getTranslations } from 'next-intl/server';

import { Profession } from '@kardia/db/enums';
import { Button, Checkbox, Select } from '@kardia/ui';

import { searchSentence, startSearch } from '@/app/actions/search';

const R1_PROFESSIONS = [Profession.NURSE_HF_FH, Profession.FAGE, Profession.AGS, Profession.NURSING_AID_SRK, Profession.PHYSICIAN, Profession.MPA];

/** Startseite: drei Fragen – Beruf, Pensum, "Was darf auf keinen Fall sein?" (PRD 7.3). */
export default async function HomePage() {
  const t = await getTranslations('public.home');
  const e = await getTranslations('enums');
  return (
    <div className="mx-auto flex max-w-content flex-col gap-12 px-4 py-12 md:px-8 md:py-16">
      <section className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-h1 md:text-display">{t('title')}</h1>
        <p className="prose-k text-body text-ink-700">{t('lead')}</p>
      </section>

      <form action={startSearch} className="grid max-w-3xl gap-6 rounded-card border border-line-300 bg-surface-0 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            name="profession"
            label={t('q1')}
            placeholder={t('anyProfession')}
            options={R1_PROFESSIONS.map((p) => ({ value: p, label: e(`Profession.${p}`) }))}
          />
          <Select
            name="workload"
            label={t('q2')}
            placeholder={t('anyWorkload')}
            options={[100, 90, 80, 70, 60, 50, 40, 30, 20].map((v) => ({ value: String(v), label: `${v} %` }))}
          />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-caption text-ink-700">{t('q3')}</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            <Checkbox name="dealbreaker" value="nights" label={t('dealbreakers.nights')} />
            <Checkbox name="dealbreaker" value="weekends" label={t('dealbreakers.weekends')} />
            <Checkbox name="dealbreaker" value="splitShifts" label={t('dealbreakers.splitShifts')} />
            <Checkbox name="dealbreaker" value="shortNotice" label={t('dealbreakers.shortNotice')} />
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" size="l">
            {t('submit')}
          </Button>
          <span className="text-micro text-ink-500">{t('noAccount')}</span>
        </div>
      </form>

      <form action={searchSentence} className="flex max-w-3xl flex-col gap-2">
        <label htmlFor="sentence" className="text-caption text-ink-700">
          {t('sentenceLabel')}
        </label>
        <div className="flex gap-2">
          <input
            id="sentence"
            name="q"
            maxLength={300}
            placeholder={t('sentencePlaceholder')}
            className="h-control-l flex-1 rounded-control border border-line-300 bg-surface-0 px-3 text-body placeholder:text-ink-500"
          />
          <Button type="submit" size="l">
            {t('sentenceSubmit')}
          </Button>
        </div>
        <p className="text-micro text-ink-500">{t('sentenceHint')}</p>
      </form>

      <section aria-labelledby="usp" className="grid gap-6 md:grid-cols-3">
        <h2 id="usp" className="sr-only">
          {t('uspTitle')}
        </h2>
        {(['ward', 'roster', 'reality'] as const).map((k) => (
          <div key={k} className="flex flex-col gap-2 border-t border-line-300 pt-4">
            <h3 className="text-h3">{t(`usp.${k}.title`)}</h3>
            <p className="text-body-s text-ink-700">{t(`usp.${k}.body`)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
