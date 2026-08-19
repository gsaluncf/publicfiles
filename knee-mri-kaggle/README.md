# Knee MRI on Kaggle: course notebooks

Five notebooks for the RSNA Knee MRI course at New College of Florida. Run them in
order. Two warm-ups teach the Kaggle workflow and a first trained model. Three
lessons work on the knee MRI data.

Competition: https://www.kaggle.com/competitions/rsna-knee-abnormality-detection

| Order | Notebook | What it does |
|---|---|---|
| Warm-up 1 | `warmup_1_titanic.ipynb` | How Kaggle works; train, cross-validate, shuffle control, write a submission |
| Warm-up 2 | `warmup_2_images.ipynb` | Train a small network on images with the GPU |
| Lesson 0 | `00_fundamentals.ipynb` | Cross-validation, a classifier head, and the shuffle control, by hand |
| Lesson 1 | `01_naive_baseline.ipynb` | Frozen ImageNet encoder plus a head; a leakage example |
| Lesson 2 | `02_encoder_bakeoff.ipynb` | Swap the encoder; confidence intervals on the result |

## Open a notebook

Open in Kaggle (best for the lessons, which read the competition data):

`https://kaggle.com/kernels/welcome?src=https://github.com/gsaluncf/publicfiles/blob/main/knee-mri-kaggle/<notebook>.ipynb`

Open in Colab (best for the image warm-up):

`https://colab.research.google.com/github/gsaluncf/publicfiles/blob/main/knee-mri-kaggle/<notebook>.ipynb`

## Notes

- The lessons read the competition data from `/kaggle/input`, so run those on
  Kaggle and attach the competition under Add Input.
- Kaggle needs a free account. The GPU and internet used by the image and encoder
  lessons need a phone-verified account.
