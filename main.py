from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.http import MediaIoBaseDownload
import time
import random
import string
import docx
import re
import io
import os
from pdfminer.high_level import extract_text
from google import genai
import json
from joblib import Parallel, delayed

# All SciOly test banks
# '1lhyd0Svy-JQlZEGEjPPB2q6qK2AC7yJH', '1vqu1dY89xBqqZxI9rdYYvlrghVQnMKAe', '1dh3T45cSCr6dkTllG-z05Sncfdtypy-t', '1XR79OZNxdwn--E_OoBF-s2225m1BfSvN', '1SPws4xgGX8qgcm3tACbRSY5tCT4bUcSG',
# '1PG2_VBfOVMhR5eiQ21yjTpm7x5tLfmRa', '1dT2hn7Hv1VXASl-XR--xgS5valGxZYrq', '1sDRu5Z0_Ob0n1P-H3daT84i_a7GKMUWm', '1YnhsbdhlrCAVwBHwYIaXgbOJmPWhgpJ6', '1PpadvuBMi6MgESulk6j8beewkoIFj-bn', '1VJzwoh2Pzg9jkCoJljHDPTphZfVvHoxx', '1njR0iqCPr7YW8XW_FlvaTEv4nU6gAINx', '1sVSw15a6LeT-Z7x9qOyxg8QcxFT65_HQ', '1sGJWoKsQ6GIwyLoYvXQI_8axYA7rso8U', '1kthkoUgPHm1tlo3gLpLAu_Zr65eoJUI5', '1TRQCWDCqDjQHGY4vwIOaUhyDDa4mNPjp', '1pXXsRglN5v5HfG_r2TulAeGYv_bFT7z7', '1iq9HI2naY6_5mlcLykVeQUZjAeDfvSqT', '1I4FvwKo5BIyIabiegfhhcLCtQCHabqP3',
#  '1IsCJdX4yMBoE9T2d-WZTMLFN2cpRoc5T', '1Nv6AvrWNlJ3HiOK3D00c98D-qCX4kSdi', '1qe8mnZTSnO5SCfbNCgCtaSN2_bGUjXGh', '1x4fl2rGF49l1imEp0Xg_zXCGqrXlZT3K', '1Df2ZJ8tdgUuIBPBEQpBV0iP8MW4paDCk',
# '14inBI0VlhCqHEKUmLUQ6yHXLX1A15OC6', '1_GMig5s8uc9eti-vYm94rPxGBoeORKue', '1B2Pw4GzvuodcmPRSz36FficDsBHfh9U2', '1e2tAROLDf3SN3UMcBIn4Smi2SXB4EaFe', '1f3MPRWWfXkWImz1yxrhYUhFFychcJHX7', '11NvL0LMkxKgsFh21Ul4RwAgbhsmJpda0', '1-h0tIxxtAH21nBPmtefdUq0yhocUO4Hz', '1W238K-m0fXYy33UI6qjD_H45fsTq9MyZ', '12AEJJmEQmMROC9-6dPiK5jUp9RDy_j0J', '1pfFyQhlfguTqEJjpXov9pIxvvPKcHZpd', '0B8zsKGejhk8QfnNYXzkwV1h2STZpMDdBQ2VYOW1td2RiWEEtckdlWTdfT19DTEFsYTVVVGs', '1M1Bhjypo-78cqFMswVmYfeXjQBBZw5Dh', '1MbUUj9A_-F2qZ2ULgiufw5BWJytt4d4Q', '1SuL2ORETV660yK8VRzdI83OUtyfJI7H5', '15a1YDspbn97sh77AIqCHz6DCM6e0TyE9', '1nuwz12RY_fROv3-9XLAbULxj1oM3gVsP', '1DKWyV3LQQmCm-r-pl-4B3z_DFG9kYekR', '1pY6RKvz8KGr6Z9tlKIJALtfbg58jDd1u', '1p23UjfzgDuSONOE9DtUlrulLrNeFUm9z', '1_63CTy4s5e2Kf6ncg1G-T3a1cYdL58tB', '1fhAySyzINkA5AQxIgv5vp0tM0Ysx8J9g', '10ADANsfPli3tkieZZoGZ4j2yDt3tZs1I', '1o0bnX6QG3krfssWCHkN3o2R_MBzZyjrw', '1_J57iYz0XxIwc6x4v7DSVI7RXXa_U202', '1yAqY6zn9VxY2OyCZlD7GTna1NAC45LmF', '1U_83pft8DJMgjFhUgGlNx3-RODVYWi3R', 
# '1KaedADenFdH8dqgCKcf29oXQpZyjpdte', '11p-L-rAL2KTPqpkycg1zQ9U2ArvK7W_I', '1ADZ-EdI94T1hre188rxGhESYG5GjaeQZ', '1m4_4IAe9nFc5UZQBTZF2vU9EYLhj4EEH', '1_sQ9jrHWmVt857CcwY9uIGeSGFBl1Ymz', '1UoVRFw-tdmRxM4-hEeJxHwViW5vMlZID', '1Pp7tLWEzpmJ1NSmZ4GbHJGMD_albpTd4', '1le1-CYcJ3_YetP_3X7jwe50O6mwihLCp', '1W_Tcjn-LttQ246C2tPeweBwkCcHhhNKZ', '1BWVRP_eFPscYhMYOZH-mPVZBAYrBvzZL', 
# '1tBevfGz0vVUfvhGj1x51NpPOMlOYGK8_', '1xAWXoJj12l7gEe8V-uGteRskrYssGim6', '1O3cmlJEC5AvUUc8IwOy2k9oMt8ifKPQq', '1Vz6d8PiGfYzk0QDA1cG0ESvFNf_hgW4H', '1u8e22PI_d65G-lxnYPiPz13B5zC1vKv3', '1kDL5X0l-hgUHF0dZDbA2g2au_7m9EtJR', '1nxQcwJ80HB0tfZnIXroGUNeou_yJsKsm', '15wSx7279Pnz8Voy_6Ca7j7MHEHlRBBvh', '1W9lanA5clZz7F-37ni0jn3zXr6Dv6qBt', '1SfRGTD4hto_3QMKW9kc4J6fQ4sJNfCQV', '1qPTWGCxwQmFc0jOCri7dcf1q8LHZ07tu', '1T5Oy_vs5VGG0X-H1IqQAYJ1DaS45pwAm', '15QaImPeZZ8DQqF0mJdDo7j81jpCgQGdD', '1AG-tp0_hyX1YlZfusrOISaq_6tu4u2Ah', '1NvgiSGFHW0VjA7WcAre-O0JYl2n6CoJH', '1IezNuPN-iMRXysBbIYx4SE817eXhvobp', '1jpxLXIQqPHINhUQAp3MH1BO0U_za_cTI', '1PSJ15uMXL9zzIMa-m8cLvf1PX7CiWqVo', '1z4ixSqqHfGeJd2JnZnSmftCSyxFyRLLb', '1ur-B7eWRyt70p7wkg7Wg1pGkkKaE1W0B', '1TMCWdLlOjnRFUy7SBuYbj6ur__xwkAk7', '13yNsNguUT7TDjLAdM3b6kffzSh7rgR5A', '1xoVEkV1YEXa6dTuFEzXKIo-QgZj84MAP', '1OML-ZgbV12_9CWKDCtjMhsQ1HuppWYu3', '17ounKibxg78Zs5K7ANTrKc2HZMbZWUdc', '1dOShoe9xFn0WOxvvlmdej2qJaKDqJtuj', '1hwbtfm8m2V6Hj4HYIo7SS45tmgf36g8v', '1WfsB8nqU5ho4CiWw9KjXEaC-CK4eV-_a', '1zsV_AM9dw_3hrbJEokkgELAI9Mctqafn', '1XdYRVuOHAr05HZSuHLSgbNroFl-kWnBl', '1xAQZDOqHEQh_O2G1evPyIorNiNPrgbtG', '1z-15Pu6jZeryJbhiV7QVkAuzbKir1CFm', '1iSR_xc48OuykFRPaUi_kJ1oQWFLgrW3q', '14a4cVDPXjLcyn97PnPNmh9nXc5B7rvIw', '1rpA0bVImjfH00Hzpuc7r4J7IY1UnEITX', '1uv_aNdDVI8ZS1jmfVil6X9VnU3MyuS55', '1cG61YoOH9sgUxEU4I0yiN3huv_4G3Gnq', '1Ci0C62oIbeLmZOQ_S5QGYibYA_ZxZo2e', '1as5mvrBbUYOkKc9Mpa8u7fy2XmBm8yXy', '1uOGAVgh2_V__z9lp-muA9lmBrZXms_IL', '1hq-CiT3Qu3gCxDqV2aHzZeKzSTrv7402', '1z8LwIB6p2ZGM8fqDC0oG3QL8JeV8aG5H', '1dOg4VfnQG8slPQVP887PEO0OmFhVSSzZ', '1_CWR_rg1XdDbo1eCwbYzCWP4gOgVnoua', '1v3ZNnfV9M2MBTkbfxXcUY5KetM_-V_2P', '11scWTMvMucVqpdFBUjkluL_Xrlbs8dGE', '10RudIkUKZe2ZIFySQcUOvDlVQGCeFiUd', '1LvjKVW1jNaYapxvY3qF19TLY0Zan8qpv', '152pUw9g81hZhBLB6MV8PJNoKWX3B4iai', '18va6_rBbYw05UaqcQQCD7BAkdh48UZN5', '1fGIDpV6a0ORRiUAbq6Wrdc0BdxEOovzh', '1UbCn9hftkUhTCfNduTbKPo0-FR0vJmmK', '1GbBQRng4pxKxykcRiJKR9MZ7vAHuPP6H', '1-tsYsrgpwDVHBQlSfGxM74qWPPaslYUr', '1Y7buTFhs7U3Kd525PF6eeI7BJhoJZOPC', '1zn5zzR_Nr-PPdjRJybrtQwKhfkRG3IJC', '1rzVRMu7W6SxLoQASux5yA3Ui9P1uZkfs', '1xwYa0Vpl3tHnPiBvGDGbuIK0nEeu1LbH', '1rX8xJlB30NtRHO3RTuIfhqEzNsQKVfL5', '1CA5XHwhdFOZCJ2ES7ITprWoksCWORtX8', '12FWeJAGtJMLNl23hwUICX8UtCxe82-nU', '1XYTB8A9UAI_fuMPZ945RHtihKrihpNS0',
#  '1WjEGUQ1v0pwkxuvAoPuWFaWk_m9Atqjx', '1AlyoRMtJpxaxUen5g32QSr1RSsfb8ZLs', '1JNYgRW4INdGz4dWvGzvlugDuljzL8_s2', '1R4p-eoORhUaJfgd5Xx3SfSVaDtOE6Gge', '1oZCbJrUGCSDP5Ri06ZwxoEFziysMNAb5', '1HDZvUwrqPeYFIkbDlZ7RF8mGYMO8nnwJ', '1moQDbIwa8-BBg-zVl8zKLBrfdOIxrqMk', '1vwoNOyhkEiPYZoCP1k3lRfh5E9V7_Vvu',
#  '1lTgv1XSHLPmnWXblO7wtjUmVhdiit0WX', '1WAWO-UMCnaYMd8AIFKefgl7Fdg5keGp2', '1-IvKrMX_vw-2MQjiL3payF1fnHeOmQyZ', '1OYqBkCYi44uxhJivexYW7FOpVnBOz_7K', '1UDWmwNkkoBw1X4tQ6-MX6yD2K59xs-G_', 
folder_links = [ "1BpxlARTpcOZnPEXB42jwdlYNqyvIu3yl", "1fgSfCMwJC1VNVcYiTpACMlPciyCq2fbp"]
#  "1IizO4wRXAalfo6Z0ynj8syv8J9Kq4QhJ", "1VTmMW_hzG4oJY3BKvtMCMbYzrEMxhQBf", "11AnFuPyuTstiovCIYNV7wBh8lYKO3Sad", "1yiXfUn9aTdkMiBpWc05TYWb1EjPONbuh", "1ZKlmk15VpRL2LO-4PxQ1Syq13dXlPmPL", "1ddHswRBxDZAzWuxo3iCfBm3db6zdXHli", "1oh9T8XmcnivHcocaOUg3qyeXQh3Hkyuj", "12rBfEdhG2ZvYphgIZmbebrvAMuPycWSe", "1-PgyUnuQPMXemGOQkrhxVOT3RUMkamcu", "1crPGoX6t7Qzf71fRHQU9Uu4dmMU37Y7N",
# "14VQ-fQtM6KX1sgjYViVVAAyjqe2S5ZIb", "1xiUztzwYyjxVdZ0gbHteSd-gVxr4ubTX", "1bFdLElj8-D1OYCeJJiw9HdChftAzBYs2", "1OxUV9xfSR9FFyIf7yPSD7Mt6YUWuF3TV", "1Uz3_v4IeYNDVh1G8dl_fxwFESccCBGXA", "1CfJPGl8aH6Mttlb-OwmWSp2BxuHpt99q", "1UE2DSnlDThEBWEejMpXrejlQBetO5Koa", "1LXjZvlMHBGJAAIBrjkL1e82yKzGx7IGk", "16TAv-p0HLFn0gv1FDV1cmdfbXP6GCF82", "1lLjX1tYePKkSdC3kh35pzkPr0CZq2vLO", "1M5xsUqF_AN5qsD5-Kg4X22Q-oSb4Ol2X",
# "1nyZ7V9PThLyYaQGOH4i1vNfReuTlOD6-", "1j1f4LA4YTClgEbP0dFYMf6hggadH-xmK", "1n2ZWpvswOJ7YVO1ynbTkJxsG45k1BYgX", "1fyW0fef7rMpRisrD6u1dqAYAg8jjBt-K", "11IFLbY-SibPkwNc7y2g70lghdinhQlXA", "1BPWIOiaKwqGPLm37CMQRNtyLpoB4i77J", "1VACGwliNbioHwPsKhvn_usScit36zLL_", "1T66k0fCIu5pO52UDZWnb71CbpLahN_8a", "1RhK-_Y5a6elhWOluddCQ0mmzD4pBEjS2", "1X0HmM4JTtJnTFqO752xqcFiN0UL99k7l", "1UJQhPqrM_oSCNBYKdhg-_6zmdr6MvIVB", 
# ["1qJ7lA2Gb1RowkVLaDbKHMNhy1V2GmsIY", "1Wr5ebMbEwV0S_RTS13Opz-5Ft-opEQHC", "15eKiKVT2_Zr7w9npq6pecZnDDRVdOEyG", "1pAF8uvT0A47dN4GQ6A7X6JTbZRumw48t", "1GI-v3SqPtVJPasx0K7zUqQd7MsMBPL56", "1LT1SKs1qx4gKQ5fFJIJ9VCnGAbyjEvCo", "1I0PnhIRW2iRedi9xI_HYgcjboaMNzGSL", "1WX4E5Uvom5stooo0Dh8aMBygZun3BS_m", "1pgrZVW23m0vfNd_K-qjhe4TV1hsGOmfP", "1_vXDzeBfqltKsAnnFVkrVEL1d5CbX4cW", "1zvNHH3UwCqonMzkozcKKA9Sfl-tfHVpF", "1SR2ZO78eFtGhl-nnyP5JsiHCAOcm0dBK", "1y219yYorJ81NpmGm-7QQ4VQ3xrj8AiAi"]
# ["1zJkjmAh6-ZddC771HUtnIvEL8qFUli5u", "1AoSuX06mjjEGmDOEYTgbvFS7jn-15NfO", "1aCrH8QyW8iUCRG2AMjF7StTLPkZPl1jq", "19mzkomcuvs-C_93WsP33v2HA8aEgccUh", "1AQ8P7YtjTcftAWbu_wWoI5aa5Yvn4CY7", '1EAtrOyeBiUWaeVZl12tb30kUyBFG6UJe','1wmuuttG_ul2_Mjic5xBQ0asmHocoYHvG','1s6pki2WtRz_zK_tqwvT724n7IovYw5Ve','19moRp7wksYgS3eZjo1bTqknKJIRmiygB','1-sadF0VSJON3IMnLbh985W6eWCbMFzZz', '1IDizVjKY653tirK8mXY2nr8v6vULSigj', '1aUVSo-q37Q4r4jIEo7u4dC_SFTNEhtUQ', '1DlT2W76zwsQTtQ4R1TM4pzX0LJjTlrOg', '1pmMKZCNCSRvzjMz6yJJX08yyFJqqUk6p', '1ebGfMbno4w_onAaER4weiSiCK-v69662', '1qA75580QHXEzt14oXi37niBbWnz4h6qt']
#['1vsuLDZ7IpImkHvWEejRvfm8V6jfrXPYM', '17wYpjKf1NpBbeLhlGmPR6aA8ovBVlIU', '1o0bnX6QG3krfssWCHkN3o2R_MBzZyjrw', '1BHd3wnXusrbyrf4xDgxQfd3upYIrnrZm'] #'1NL86PYG1ZBm1-AEKFwdG8t00iUGBEpOl', '1VxWl3crjSoA0_mB89Gg4KgpiT5nnHfEG', '12msP3XgqOJGMFjrFk7ZEnFtBz4pGdCuG', '1CC2sOz8P2mDImZ6BAsIeiUmVzH1c3Rb9', '11v3MGE07t8FIpDpLFHvijSr-qeRVb4Xp', '173fFK0af9iD1UJsgX2u6DiwMEb1tbgWf', '1w2Rqq6dYjzVlfdVFFdMgM_PxPtKEZgTH', '145UHXMxOCw3HD_96u6NThKGZOAz_E_VI', '1MQ3tvV9HZYVtBL5rgvEFKqCwIMX7n69g', '15J2z5LFEVw5viRTbIxpFHrzvkNxoDg3R', '19_dbGVXc0FGIM8Tnc7rOltC0itgIKiVu', '17vIUN2TB60Oh-6JSeQYsUoGhbGhyrTPs', '1iFWBirR_3XfMaMsUVFFDxRuQeavYRSIV', '1LZsgdiaV03jP3MmTnC6ecGrh7H8x_NrI', '1FK89x4X796k5EEt44tzOoF__5aDaaFON', '1boGp0TkwJhyXwA5m41lxOl_Af35VsNls', '1nEeX66uXjDt1x2SIsIJSekfvHdORlfXSs4WsX1piiuGPIKSyDduZtQtn6jZsDyvyD7Vv7S7t', '1UDUMUAmaoinPCNNGbMYAh4BdPHHwJjtb', '1q1Dp8UWoRnM9Lfks-CVsnTiARrTCvWgn', '1zw8FV7ckEzKLFxXKq8VKXvybEAEHRq45', '1-QxFq3Kb3EBH4MNGzVGFM4pJZIfL2OHp', '1GyVv6gRfdmnv6GjUIQ9cV2AN19GHMqle', '1dl9j-DcpJ1MwcsHhGh9KUuSqHAQ3BBba', '1Zkx8Ff2AU8dQnEw-mV9Dgpy9cuZvK-0b', '1DzDpuDSMsQ4rype0KjGV0eCz-05NkZAz', '1yueokX907oLJwn0ciuH5frr76higotKC', '1TMNILZO9AJoX2F59BiYI9WW6SO4BdPkN', '1LmOcZmFC031XqLHQjyqCQqTDH7vUIj3E', '1EJsqz6WLyjMOVAXd8FcU72q2e49Yyzxm', '1hHuR5gT0RzM3kddQJUEYxxVtj2E1oMqJ', '16Bq3Sd-tFdfJNg_zvYhXRLdkqoByaP2l', '1S2rEBjyC5coFC8reDAlGrEly8oTaYdTc', '1bYsvKo-Sr1iqLKSkKZS4x4H40r4xegBe', '1HVPILYcjVVgm0Xh6TEgO8eaQobKox5BE', '1CIN0Yq0nU0PokLvJ2RNIVZt2WmbJ492M', '1WrhBeK56tbBmvTn2k6Hx6aBObxxv_GPv', '1t67OdhZRW7FkenNQUKV7svAGme3j5lVG']
# '1egVORNPbZQE9YNJKJggjtunUvWXyNz7T', '18BTa-l6MYxlHtCVtAdMpsVIKFNPyebRk', '1EybtPvcXlncBvk89xJsR4U5yWx1fOz7D', '1EybtPvcXlncBvk89xJsR4U5yWx1fOz7D', 
events = [
    "Anatomy - Skeletal",
    "Anatomy - Muscular",
    "Anatomy - Integumentary",
    "Anatomy - Cardiovascular",
    "Anatomy - Lymphatic",
    "Anatomy - Excretory",
    "Anatomy - Respiratory",
    "Anatomy - Digestive",
    "Anatomy - Immune",
    "Anatomy - Nervous",
    "Anatomy - Sense Organs",
    "Anatomy - Endocrine",
    "Astronomy",
    "Cell Biology",
    "Chemistry Lab",
    "Codebusters",
    "Compound Machines",
    "Designer Genes",
    "Detector Building",
    "Disease Detectives",
    "Dynamic Planet - Glaciers",
    "Dynamic Planet - Earthquakes, Volcanoes, and Tectonics",
    "Dynamic Planet - Earth's Fresh Waters",
    "Dynamic Planet - Oceanography",
    "Dynamic Planet - Tectonics",
    "Ecology",
    "Entomology",
    "Environmental Chemistry",
    "Fermi Questions",
    "Forensics",
    "Forestry",
    "Fossils",
    "Geologic Mapping",
    "Gravity Vehicle",
    "Green Generation",
    "Helicopter",
    "Herpetology",
    "Hovercraft",
    "Invasive Species",
    "It's About Time",
    "Machines",
    "Materials Science - Ceramics",
    "Materials Science - Polymers and Plastics",
    "Materials Science - General"
    "Microbe Mission",
    "Mission Possible",
    "Meteorology",
    "Mousetrap Vehicle",
    "Optics",
    "Ornithology",
    "Rocks and Minerals",
    "Reach for the Stars",
    "Sounds of Music",
    "Thermodynamics",
    "Wind Power",
    "Potions and Poisons"
]
def authenticate_google_drive():
    """Authenticates with Google Drive API and obtains token.json."""
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"Error refreshing credentials: {e}")
                os.remove(TOKEN_FILE) # Invalidate the potentially bad token
                creds = None  # Force re-authentication
        if not creds or not creds.valid:
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
    try:
        service = build('drive', 'v3', credentials=creds)
        return service
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None
def list_pdf_files_in_folder(service, folder_id):
    """Retrieves a list of all PDF file dictionaries (id, name) from a Google Drive folder and its subfolders."""
    pdf_files = []
    try:
        results = service.files().list(supportsAllDrives=True, includeItemsFromAllDrives=True, q=f"'{folder_id}' in parents and trashed=false", fields="nextPageToken, files(id, name, mimeType)").execute()
        print(folder_id,results)
        items = results.get('files', [])
        pdf_files.extend(items)

        # Retrieve subfolders
        subfolder_query = f"'{folder_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
        subfolder_results = service.files().list(supportsAllDrives=True, includeItemsFromAllDrives=True, q=subfolder_query, fields="nextPageToken, files(id)").execute()
        subfolders = subfolder_results.get('files', [])

        for subfolder in subfolders:
            pdf_files.extend(list_pdf_files_in_folder(service, subfolder['id']))

        nextPageToken = results.get('nextPageToken')
        while nextPageToken:
            results = service.files().list(supportsAllDrives=True, includeItemsFromAllDrives=True, q=subfolder_query, fields="nextPageToken, files(id, name)", pageToken=nextPageToken).execute()
            items = results.get('files', [])
            pdf_files.extend(items)
            nextPageToken = results.get('nextPageToken')

        subfolder_nextPageToken = subfolder_results.get('nextPageToken')
        while subfolder_nextPageToken:
            subfolder_results = service.files().list(supportsAllDrives=True, includeItemsFromAllDrives=True, q=subfolder_query, fields="nextPageToken, files(id, mimeType)", pageToken=subfolder_nextPageToken).execute()
            subfolders = subfolder_results.get('files', [])
            for subfolder in subfolders:
                pdf_files.extend(list_pdf_files_in_folder(service, subfolder['id']))
            subfolder_nextPageToken = subfolder_results.get('nextPageToken')
    except HttpError as error:
        print(f'An error occurred: {error}')
    return pdf_files

def download_file(service, file_id, filename, mimeType):
    """Downloads a file from Google Drive."""
    try:
        request = service.files().export_media(fileId=file_id, mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document') if mimeType == 'application/vnd.google-apps.document' else service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            print(f"Download {int(status.progress() * 100)}%.")
        with open(filename, 'wb') as f:
            fh.seek(0)
            f.write(fh.read())
        return True
    except HttpError as error:
        print(f'An error occurred: {error}')
        return False
    except Exception as e:
        print(f"An error occured:", e)
        return False

# --- 2. Convert PDF to Text ---
def pdf_to_text(pdf_path):
    """Converts a PDF file to plain text."""
    try:
        text = extract_text(pdf_path)
        # if len(text) < 50:
        #     # convert to image using resolution 600 dpi 
        #     pages = convert_from_path(pdf_path, 600)

        #     # extract text
        #     text = ''
        #     for page in pages:
        #         t = pytesseract.image_to_string(page)
        #         text += t + '\n'
        # print(text)
        return text
    except Exception as e:
        print(f"Error converting PDF to text: {e}")
        return None
def docx_to_text(docx_path):
    try:
        doc = docx.Document(docx_path)
        full_text = []
        for paragraph in doc.paragraphs:
            full_text.append(paragraph.text)
        return '\n'.join(full_text)
    except:
        print("Error getting docx")
        return None
def extract_questions_with_gemini(text, events, idx):
    key = GEMINI_API_KEY[random.randint(0,len(GEMINI_API_KEY)-1)]
    print("using key: ", key)
    client = genai.Client(api_key=key)
    prompt = f"""
    Identify the event this test most likely belongs to from the following list: {', '.join(events)}.
    Extract all multiple-choice questions and output a compressed json object of this test with a schema similar to this:
    {{ "ecology": [ {{ "question": "What is the primary role of decomposers in an ecosystem?", "options": ["Producing energy", "Breaking down dead organic matter", "Consuming producers", "Providing shelter"] "answers": [2], "difficulty": 0.8 }}, {{ "question": "Which of the following is an example of a symbiotic relationship?", "options": ["Predation", "Competition", "Mutualism", "Parasitism"], "answers": [1,2,3,4], "difficulty": 0.2 }} ]}}


    Multiple choice answers MUST be 1-indexed if possible to answer, and usually have only one correct answer but sometimes multiple.

    Anatomy tests may have multiple systems, so you can use multiple upper level keys if and only if the event is anatomy.

    If the question is free response, leave the option field blank, but have one element in the answers array providing a correct response. If the question is intended to be true/false, turn it into mcq

    If a question depends on previous information or previous questions, provide that info in the current question itself as context in every question that needs the information, since questions might not be seen in order.

    Do not merely repeat the question in your answer, give a proper answer.

    Here's the test:
    {text}

    """
    try:
        response = client.models.generate_content(model='gemini-2.0-flash', contents=prompt, config={'response_mime_type': 'application/json'})
        if response:
            return response.text
        else:
            print("Gemini API returned an empty response.")
            return None
    except Exception as e:
        print(key, ": Error interacting with Gemini API: ", e)
        time.sleep(8)
        print("slept!")
        return extract_questions_with_gemini(text, events, idx+1)
def clean_question_with_gemini(text, idx):
    key = GEMINI_API_KEY[random.randint(0,len(GEMINI_API_KEY)-1)]
    client = genai.Client(api_key=key)
    prompt = f"""
    I want you to process these questions stored in a JSON dataset based on whether they can be
    solved with the question itself or not.
    If it refers to an image, diagram, figure, or a non-textual component that's not in the question itself,
    make the answer field be an array with an empty string inside like this: [""]. This is especially prevalant when the question
    mentions "this" without any context. Otherwise, do nothing.
    Additionally, review the 1-indexed answer and ensure its validity, as well as the difficulty. 
    Here's the test:
    {text}

    """
    try:
        response = client.models.generate_content(model='gemini-2.0-flash', contents=prompt, config={'response_mime_type': 'application/json'})
        if response:
            return response.text
        else:
            print("Gemini API returned an empty response.")
            return None
    except Exception as e:
        print(key, ": Error interacting with Gemini API: ", e)
        time.sleep(8)
        print("slept!")
        return clean_question_with_gemini(text, idx+1)
# --- Processing function for a single PDF ---
def process_pdf(file_info, drive_service, events, output_dir, idx_offset):
    idx = idx_offset
    file_mimeType = file_info['mimeType']
    file_name = file_info['name'] + ('.docx' if file_mimeType != 'application/pdf' else '')
    # download_name = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(5))
    file_id = file_info['id']

    if not "no answer" in file_name.lower() and re.search(r"experiment|road|( map )|statemap|forestry|widi|write it|tower|scrambler|robot|trajectory|helicopter|electric|bungee", file_name.lower()) or re.search(r"key|sheet|answer|result|image|response|checklist|distribution", file_name.lower()):
        print(f'{file_name} was not a pdf that contained the text "test" or "exam"')
        return None

    print(f"Processing file: {file_name}")
    pdf_path = os.path.join(output_dir, file_name)
    _, extension = os.path.splitext(file_name)
    # if extension == '.pdf':
    #     print(f"{file_name} is a pdf :(")
    #     return None

    if not download_file(drive_service, file_id, pdf_path, file_mimeType):
        print('Can\'t download file')
        return None


    print(f"Converting {file_name} to text...")
    text_content = docx_to_text(pdf_path) if extension == ".docx" else pdf_to_text(pdf_path)
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    if text_content is None or len(text_content) < 50:
        print("too short")
        return None

    print(f"Extracting questions using Gemini...")
    raw_output = extract_questions_with_gemini(text_content, events, idx)
    if raw_output is None:
        raw_output = ""
    raw_output = raw_output.replace('\00','f[]')
    if raw_output is None:
        return {}
    try:
        gemini_output = clean_question_with_gemini(raw_output,idx)
        if gemini_output is None:
            gemini_output = ""
        gemini_output = gemini_output.replace('\00','f[]')
        questions_json_str = re.search(r"\{.*\}", gemini_output, re.DOTALL).group(0)
        try:
            parsed = json.loads(questions_json_str)
        except:
            try:
                parsed = json.loads(questions_json_str+"]}")
            except json.JSONDecodeError as e:
                print(f"  Error decoding Gemini JSON output for {file_name} ")
                with open("failed.json", 'a') as writefile2:
                    writefile2.write(re.search(r"\{.*\}", gemini_output, re.DOTALL).group(0))
                return {}
        if questions_json_str:
            questions_json = json.dumps(parsed)
            return questions_json
        else:
            print(f"  No JSON found in Gemini output for {file_name}")
            return {}

    except Exception as e:
        print("Error!")
        print(e)
        return {}



# --- Main Execution ---
GOOGLE_DRIVE_CREDENTIALS_FILE = 'credentials.json'
GEMINI_API_KEY = []
OUTPUT_DIR = "extracted_questions"
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- Initialize APIs ---
drive_service = build('drive', 'v3', credentials=Credentials.from_authorized_user_file('token.json', ['https://www.googleapis.com/auth/drive.readonly','https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/drive.appfolder', 'https://www.googleapis.com/auth/drive.file']))
drive_service = authenticate_google_drive()
all_extracted_questions = {}

# --- Process Folders and Files in Batches ---
idx = 0
with open("beta_bank.json", 'a') as writefile:
    for folder_id in folder_links:
        print("Looking for files in folder...")
        all_files_in_folder = list_pdf_files_in_folder(drive_service, folder_id)
        pdf_files_in_folder = [
            (f
            )
            for f in all_files_in_folder
            if 'name' in f
            and (
                 f['mimeType'] == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                 or f['mimeType'] == 'application/pdf'
                 or f['mimeType'] == 'application/vnd.google-apps.document'
                 )
            and not (not "no answer" in f['name'].lower() and re.search(r"experiment|road|( map )|statemap|forestry|widi|write it|tower|scrambler|robot|trajectory|helicopter|electric|bungee", f['name'].lower()) or re.search(r"key|sheet|answer|result|image|response|checklist|distribution", f['name'].lower()))
            ]
        index = -1
        for i, obj in enumerate(pdf_files_in_folder):
            if obj.get('id') == "1DggM5EvrEI6d0Ys-aeVbsbIouU3KXYOh":
                index = i
                break
        if index != -1:
            print("found odd one out")
            pdf_files_in_folder = pdf_files_in_folder[index + 1:]
        



        if not pdf_files_in_folder:
            print(f"No PDF files found in folder: {folder_id}")
            continue

        print(f"Processing folder: {folder_id}")

        # Process files in batches of 5
        for i in range(0, len(pdf_files_in_folder), 5):
            batch_files = pdf_files_in_folder[i:i + 5]
            batch_results = Parallel(n_jobs=5)(
                delayed(process_pdf)(file_info, drive_service, events, OUTPUT_DIR, idx + j)
                for j, file_info in enumerate(batch_files)
            )

            for result in batch_results:
                if result:
                    writefile.write(result + "\n")
                    writefile.flush()
                    print("Success!")
            idx += len(batch_files)