$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$root = Join-Path (Get-Location) 'المنتجات_صور_من_الانترنت'
New-Item -ItemType Directory -Force -Path $root | Out-Null

$images = @(
  @{Product='YEE-3006_YSH-50'; File='01_product.webp'; Source='Beshketnyk'; Page='https://beshketnyk.com/obihrivach-dlia-akvariuma-yee-ysh-50-metalevyi-19-sm-50-vt/'; Url='https://beshketnyk.com/content/images/25/700x700l80nn0/44335047465542.webp'},
  @{Product='YEE-3006_YSH-50'; File='02_box_front.webp'; Source='Beshketnyk'; Page='https://beshketnyk.com/obihrivach-dlia-akvariuma-yee-ysh-50-metalevyi-19-sm-50-vt/'; Url='https://beshketnyk.com/content/images/25/700x700l80nn0/61775367690936.webp'},
  @{Product='YEE-3006_YSH-50'; File='03_box_side.webp'; Source='Beshketnyk'; Page='https://beshketnyk.com/obihrivach-dlia-akvariuma-yee-ysh-50-metalevyi-19-sm-50-vt/'; Url='https://beshketnyk.com/content/images/25/700x700l80nn0/97657197450677.webp'},
  @{Product='YEE-3006_YSH-50'; File='04_box_chart.webp'; Source='Beshketnyk'; Page='https://beshketnyk.com/obihrivach-dlia-akvariuma-yee-ysh-50-metalevyi-19-sm-50-vt/'; Url='https://beshketnyk.com/content/images/25/700x700l80nn0/50912206454238.webp'},
  @{Product='YEE-3006_YSH-50'; File='05_label.webp'; Source='Beshketnyk'; Page='https://beshketnyk.com/obihrivach-dlia-akvariuma-yee-ysh-50-metalevyi-19-sm-50-vt/'; Url='https://beshketnyk.com/content/images/25/700x700l80nn0/12977739102773.webp'},

  @{Product='YEE-3007_YSH-100'; File='01_product.jpg'; Source='Epicentr'; Page='https://epicentrk.ua/shop/mplc-obigrivac-dla-akvariuma-yee-ysh-100-metalevij-30-sm-100-vt-yee-3007-1f0a01b8-e15e-6fe6-846e-29be33cd8f5a.html'; Url='https://cdn.27.ua/sc--media--prod/default/df/0a/55/df0a555d-c29b-40ec-9907-76143316c503.jpg'},
  @{Product='YEE-3007_YSH-100'; File='02_box.jpg'; Source='Epicentr'; Page='https://epicentrk.ua/shop/mplc-obigrivac-dla-akvariuma-yee-ysh-100-metalevij-30-sm-100-vt-yee-3007-1f0a01b8-e15e-6fe6-846e-29be33cd8f5a.html'; Url='https://cdn.27.ua/sc--media--prod/default/f1/0e/d1/f10ed115-56d5-4a6b-9002-8bc59948acfd.jpg'},
  @{Product='YEE-3007_YSH-100'; File='03_label.jpg'; Source='Epicentr'; Page='https://epicentrk.ua/shop/mplc-obigrivac-dla-akvariuma-yee-ysh-100-metalevij-30-sm-100-vt-yee-3007-1f0a01b8-e15e-6fe6-846e-29be33cd8f5a.html'; Url='https://cdn.27.ua/sc--media--prod/default/0f/ad/0d/0fad0df2-2f91-436d-a880-d1b2ac7190b0.jpg'},

  @{Product='YEE-3008_YSH-200'; File='01_product.jpg'; Source='Epicentr'; Page='https://epicentrk.ua/ua/shop/mplc-obigrivac-dla-akvariuma-yee-ysh-200-metalevij-30-sm-200-vt-yee-3008-1f0a01b9-376a-6e1c-8ecd-134b539f6fc8.html'; Url='https://cdn.27.ua/sc--media--prod/default/e5/95/0b/e5950b5c-0b48-4e4a-9a19-55b507ea2a96.jpg'},
  @{Product='YEE-3008_YSH-200'; File='02_box.jpg'; Source='Epicentr'; Page='https://epicentrk.ua/ua/shop/mplc-obigrivac-dla-akvariuma-yee-ysh-200-metalevij-30-sm-200-vt-yee-3008-1f0a01b9-376a-6e1c-8ecd-134b539f6fc8.html'; Url='https://cdn.27.ua/sc--media--prod/default/f4/cc/95/f4cc9596-5e0c-4b93-ae33-10f86b4bb0b7.jpg'},
  @{Product='YEE-3008_YSH-200'; File='03_label.jpg'; Source='Epicentr'; Page='https://epicentrk.ua/ua/shop/mplc-obigrivac-dla-akvariuma-yee-ysh-200-metalevij-30-sm-200-vt-yee-3008-1f0a01b9-376a-6e1c-8ecd-134b539f6fc8.html'; Url='https://cdn.27.ua/sc--media--prod/default/5b/c5/32/5bc53201-13ad-4c10-aecb-9de0b5bcab45.jpg'},

  @{Product='C4-1432_Quartz_Heater_100W'; File='01_main_500w_family.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-fish-tank-heating-rod-automatic-constant-temperature-quartz-explosion-proof-water-electric-small-heater-insulation.html'; Url='https://gw.alicdn.com/imgextra/O1CN01k0LMiH1GqjmvsQ60c_!!6000000000674-0-yinhe.jpg_540x540q90.jpg'},
  @{Product='C4-1432_Quartz_Heater_100W'; File='02_material.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-fish-tank-heating-rod-automatic-constant-temperature-quartz-explosion-proof-water-electric-small-heater-insulation.html'; Url='https://gw.alicdn.com/imgextra/i2/822517260/O1CN01vVy9x023V8RpVRK9y_!!822517260.jpg_q90.jpg'},
  @{Product='C4-1432_Quartz_Heater_100W'; File='03_100w_safety.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-fish-tank-heating-rod-automatic-constant-temperature-quartz-explosion-proof-water-electric-small-heater-insulation.html'; Url='https://gw.alicdn.com/imgextra/i3/822517260/O1CN018xF04323V8RnM4g3w_!!822517260.jpg_q90.jpg'},
  @{Product='C4-1432_Quartz_Heater_100W'; File='04_chip.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-fish-tank-heating-rod-automatic-constant-temperature-quartz-explosion-proof-water-electric-small-heater-insulation.html'; Url='https://gw.alicdn.com/imgextra/i3/822517260/O1CN01ax42vc23V8RoA0Ca3_!!822517260.jpg_q90.jpg'},
  @{Product='C4-1432_Quartz_Heater_100W'; File='05_heating_wire.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-fish-tank-heating-rod-automatic-constant-temperature-quartz-explosion-proof-water-electric-small-heater-insulation.html'; Url='https://gw.alicdn.com/imgextra/i4/822517260/O1CN01u5dHMB23V8RnnNl47_!!822517260.jpg_q90.jpg'},
  @{Product='C4-1432_Quartz_Heater_100W'; File='06_temperature_control.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-fish-tank-heating-rod-automatic-constant-temperature-quartz-explosion-proof-water-electric-small-heater-insulation.html'; Url='https://gw.alicdn.com/imgextra/i1/822517260/O1CN01l5r9om23V8XHgaaQU_!!822517260.jpg_q90.jpg'},
  @{Product='C4-1432_Quartz_Heater_100W'; File='07_certificate.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-fish-tank-heating-rod-automatic-constant-temperature-quartz-explosion-proof-water-electric-small-heater-insulation.html'; Url='https://gw.alicdn.com/imgextra/i1/822517260/O1CN01T3JTKx23V8JfuTHGc_!!822517260.jpg_q90.jpg'},
  @{Product='C4-1432_Quartz_Heater_100W'; File='08_quartz_product.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-fish-tank-heating-rod-automatic-constant-temperature-quartz-explosion-proof-water-electric-small-heater-insulation.html'; Url='https://gw.alicdn.com/imgextra/i2/822517260/O1CN01VhakDm23V8Jj3F1Vx_!!822517260.jpg_q90.jpg'},
  @{Product='C4-1432_Quartz_Heater_100W'; File='09_waterproof.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-fish-tank-heating-rod-automatic-constant-temperature-quartz-explosion-proof-water-electric-small-heater-insulation.html'; Url='https://gw.alicdn.com/imgextra/i3/822517260/O1CN01A3sFQ723V8JoML8Ud_!!822517260.jpg_q90.jpg'},
  @{Product='C4-1432_Quartz_Heater_100W'; File='10_product_parameters.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-fish-tank-heating-rod-automatic-constant-temperature-quartz-explosion-proof-water-electric-small-heater-insulation.html'; Url='https://gw.alicdn.com/imgextra/i4/822517260/O1CN018SpU3q23V8Jj3HEqY_!!822517260.jpg_q90.jpg'},
  @{Product='C4-1432_Quartz_Heater_100W'; File='11_real_display.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-fish-tank-heating-rod-automatic-constant-temperature-quartz-explosion-proof-water-electric-small-heater-insulation.html'; Url='https://gw.alicdn.com/imgextra/i4/822517260/O1CN01PrRGEk23V8Jmfoe8Z_!!822517260.jpg_q90.jpg'},
  @{Product='C4-1432_Quartz_Heater_100W'; File='12_200w_variant_params.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-fish-tank-heating-rod-automatic-constant-temperature-quartz-explosion-proof-water-electric-small-heater-insulation.html'; Url='https://gw.alicdn.com/imgextra/i1/822517260/O1CN01Gu95rS23V8JnYYhNQ_!!822517260.jpg_q90.jpg'},

  @{Product='C4-1103_Black_Warrior_Heater'; File='01_main_family.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/O1CN01c5WBWD1DesiQRjzAB_!!6000000000242-0-yinhe.jpg_540x540q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='02_closeup.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i1/1911536242/O1CN01yiAw9t1vyt8LGN5zr_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='03_award.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i1/1911536242/O1CN01XA0fuA1vyt87ZKi92_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='04_auto_cutoff.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i2/1911536242/O1CN01E5mZZ11vyt8FuEjL2_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='05_saving.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i2/1911536242/O1CN01Y1ftwe1vyt8DMbq22_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='06_power_recommendation.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i3/1911536242/O1CN01J6H5fO1vyt8I4y4rC_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='07_certificate.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i4/1911536242/O1CN01mcbhod1vytKcbgPxM_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='08_quartz_compare.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i4/1911536242/O1CN01FSz5MK1vytKcg98c6_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='09_black_warrior_intro.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i2/1911536242/O1CN01Xl92Kt1vytKcg9k2e_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='10_four_advantages.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i3/1911536242/O1CN01PSp1kP1vytKd9gnTc_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='11_heating_wire.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i4/1911536242/O1CN01AHvo3L1vytKdnSmoN_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='12_temperature_chip.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i4/1911536242/O1CN0139kMBT1vytKclqPxt_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='13_in_aquarium_100w.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i3/1911536242/O1CN01I1UVYK1vytKdS428k_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='14_ip68_100w.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i3/1911536242/O1CN01ZWR9up1vytKcgAgFy_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='15_material_100w.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i3/1911536242/O1CN01O0tW1L1vytKcg7SeU_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='16_details.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i3/1911536242/O1CN01aax9x61vytKbjUizB_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='17_watts_calculation.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i1/1911536242/O1CN01yZyclt1vytKclpwqW_!!1911536242.jpg_q90.jpg'},
  @{Product='C4-1103_Black_Warrior_Heater'; File='18_safety.jpg'; Source='eBuy7'; Page='https://www.ebuy7.com/yee-stainless-steel-heating-rod-explosion-proof-automatic-constant-temperature-turtle-tank-aquarium-heater-fish-tank-heating-rod-small-7.html'; Url='https://gw.alicdn.com/imgextra/i4/1911536242/O1CN01KeNmfp1vytKbjVC6G_!!1911536242.jpg_q90.jpg'},

  @{Product='Alibaba_Official_Weifang_Yipin_YEE_Heaters'; File='01_company_factory.jpg'; Source='Alibaba official supplier page / Accio mirror'; Page='https://yeeaquarium.m.en.alibaba.com/tr_TR/company_profile.html'; Url='https://s.alicdn.com/@sc04/kf/Hb88b5579df764c5d95a3bd458892f02cY.jpg_720x720q50.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_YEE_Heaters'; File='02_ptc_heater_product.jpg'; Source='Alibaba official supplier page / Accio mirror'; Page='https://www.accio.com/supplier/oem-aquarium-water-heater'; Url='https://s.alicdn.com/@sc04/kf/H05cec0eeb4e54da18d093930c7a560e90.jpg_720x720q50.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_YEE_Heaters'; File='03_titanium_heater_controller.jpg'; Source='Alibaba official supplier page / Accio mirror'; Page='https://www.accio.com/supplier/oem-aquarium-water-heater'; Url='https://s.alicdn.com/@sc04/kf/H2cda630aacf646c482bd8e946a976bb66.png_720x720q50.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_YEE_Heaters'; File='04_stainless_heater_300w.jpg'; Source='Alibaba official supplier page / Accio mirror'; Page='https://www.accio.com/supplier/oem-aquarium-water-heater'; Url='https://s.alicdn.com/@sc04/kf/Hce32a2fc7250479f8c4a795cd1df033aO.jpg_720x720q50.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_YEE_Heaters'; File='05_mini_turtle_heater.jpg'; Source='Alibaba official supplier page / Accio mirror'; Page='https://www.accio.com/supplier/oem-aquarium-water-heater'; Url='https://s.alicdn.com/@sc04/kf/Aa8946374dfa9497eba01c285fac527f1k.jpg_720x720q50.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_YEE_Heaters'; File='06_stainless_heater_betta_300w.jpg'; Source='Alibaba official supplier page / Accio mirror'; Page='https://www.accio.com/supplier/oem-aquarium-water-heater'; Url='https://s.alicdn.com/@sc04/kf/Acbba99fbf91b447097a883b12781bea2O.jpg_720x720q50.jpg'},

  @{Product='Alibaba_Official_Weifang_Yipin_Water_Changer'; File='01_product.jpg'; Source='Alibaba official supplier page'; Page='https://germany.alibaba.com/product-detail/Yee-Aquarium-Cleaner-Multifunctional-Removable-Aquarium_1601009006430.html'; Url='https://s.alicdn.com/@sc04/kf/H0cb62c7e2e204f67b723206392b0f9bfI.jpg_960x960q80.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Water_Changer'; File='02_in_use.jpg'; Source='Alibaba official supplier page'; Page='https://germany.alibaba.com/product-detail/Yee-Aquarium-Cleaner-Multifunctional-Removable-Aquarium_1601009006430.html'; Url='https://s.alicdn.com/@sc04/kf/Aa7b463d6215a4b39853a9f5747e5b3a4q.jpg_960x960q80.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Water_Changer'; File='03_airbag_features.jpg'; Source='Alibaba official supplier page'; Page='https://germany.alibaba.com/product-detail/Yee-Aquarium-Cleaner-Multifunctional-Removable-Aquarium_1601009006430.html'; Url='https://s.alicdn.com/@sc04/kf/He94c0274378e431e9945f2ab8d2adc5cc.jpg_960x960q80.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Water_Changer'; File='04_parts.jpg'; Source='Alibaba official supplier page'; Page='https://germany.alibaba.com/product-detail/Yee-Aquarium-Cleaner-Multifunctional-Removable-Aquarium_1601009006430.html'; Url='https://s.alicdn.com/@sc04/kf/Haf1b4e3c82a94e2bbef1b2b97ba155d1U.jpg_960x960q80.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Water_Changer'; File='05_extension_tubes.jpg'; Source='Alibaba official supplier page'; Page='https://germany.alibaba.com/product-detail/Yee-Aquarium-Cleaner-Multifunctional-Removable-Aquarium_1601009006430.html'; Url='https://s.alicdn.com/@sc04/kf/H18282b7d5410481aaa4543d8491564b1f.jpg_960x960q80.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Water_Changer'; File='06_cherlam_banner.jpg'; Source='Alibaba official supplier page'; Page='https://germany.alibaba.com/product-detail/Yee-Aquarium-Cleaner-Multifunctional-Removable-Aquarium_1601009006430.html'; Url='https://sc04.alicdn.com/kf/H49cf8ac2bdda47b288099b3e44f9663bj/239201016/H49cf8ac2bdda47b288099b3e44f9663bj.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Water_Changer'; File='07_cherlam_detail.jpg'; Source='Alibaba official supplier page'; Page='https://germany.alibaba.com/product-detail/Yee-Aquarium-Cleaner-Multifunctional-Removable-Aquarium_1601009006430.html'; Url='https://sc04.alicdn.com/kf/H69e5af9b3553415f97d76eece55caf08l/239201016/H69e5af9b3553415f97d76eece55caf08l.jpg'},

  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='01_product.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://s.alicdn.com/@sc04/kf/H3d882aef27944b1192ded7ba73b50683z.jpg_960x960q80.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='02_microporous.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://s.alicdn.com/@sc04/kf/H73db5b4e75d54031ab998cec6e29cb93G.jpg_960x960q80.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='03_shell.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://s.alicdn.com/@sc04/kf/H7ce4a2dbf88f47059af9e346ef0956f9x.jpg_960x960q80.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='04_bubble_display.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://s.alicdn.com/@sc04/kf/H3b9125d124434265ab82a70a96610671b.jpg_960x960q80.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='05_metal_valve.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://s.alicdn.com/@sc04/kf/He20d9bd62d014341b7952c9517b49018U.jpg_960x960q80.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='06_banner.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://sc04.alicdn.com/kf/Haee5c370acd94a4fad0f39c8d18e39e9v/239201016/Haee5c370acd94a4fad0f39c8d18e39e9v.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='07_heading.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://sc04.alicdn.com/kf/H677a18c722a24ef787733785e1c50d1d3/239201016/H677a18c722a24ef787733785e1c50d1d3.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='08_micro_structure_cn.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://sc04.alicdn.com/kf/H9b456b24d5174febbffd43e09d490307H/239201016/H9b456b24d5174febbffd43e09d490307H.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='09_prevent_falling.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://sc04.alicdn.com/kf/H5bfbd4276a024f7f94b8d13a4739d351w/239201016/H5bfbd4276a024f7f94b8d13a4739d351w.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='10_bubble_column.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://sc04.alicdn.com/kf/H135924d4b5d34602af72abc8150d0449r/239201016/H135924d4b5d34602af72abc8150d0449r.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='11_metal_nozzle.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://sc04.alicdn.com/kf/Hafefb745308c4f89835dfc002759e79cn/239201016/Hafefb745308c4f89835dfc002759e79cn.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='12_warm_prompt.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://sc04.alicdn.com/kf/Hc538eda6505547f69b66bb31ca74d608X/239201016/Hc538eda6505547f69b66bb31ca74d608X.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='13_parts.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://sc04.alicdn.com/kf/H69df9220b4024f1b9c6dd37e85f783fau/239201016/H69df9220b4024f1b9c6dd37e85f783fau.jpg'},
  @{Product='Alibaba_Official_Weifang_Yipin_Nano_Air_Disc'; File='14_parameters.jpg'; Source='Alibaba official supplier page'; Page='https://german.alibaba.com/product-detail/YEE-Factory-Wholesale-High-Quality-Nano-1601610948729.html'; Url='https://sc04.alicdn.com/kf/Haf0402eaf51b4ed389a35e99592a65f5b/239201016/Haf0402eaf51b4ed389a35e99592a65f5b.jpg'},

  @{Product='Alibaba_Official_Weifang_Yipin_Air_Pump_Related'; File='01_related_usb_air_pump.jpg'; Source='Alibaba supplier listing'; Page='https://www.alibaba.com/supplier/usb-air-pump-aquarium-wholesaler.html'; Url='https://s.alicdn.com/@sc04/kf/H33787e71952242a2a2ec83c2610ef971E.jpg_300x300.jpg'},

  @{Product='03326_YTZ-300'; File='01_damsel_specs.jpg'; Source='Damsel Dubai'; Page='https://damselbiz.com/products/shop-by-category/oxygen-air-pump/yee-mini-air-pump-oxygen-pump-ytz-300'; Url='https://damselbiz.com/_next/image?q=75&url=https%3A%2F%2Fdamselbiz.com%2Fuploads%2Fproducts%2F1752057769385.jpg&w=828'},
  @{Product='03326_YTZ-300'; File='02_bloo_specs.jpg'; Source='Bloo Aqua Studio'; Page='https://blooaquastudio.org/products/yee-kk-8800-single-outlet-oxyzen-pump-copy'; Url='https://blooaquastudio.org/cdn/shop/files/5X7EXydI1666283680-800x800.jpg?v=1745418465&width=1946'},
  @{Product='03326_YTZ-300'; File='03_bloo_parameters.jpg'; Source='Bloo Aqua Studio'; Page='https://blooaquastudio.org/products/yee-kk-8800-single-outlet-oxyzen-pump-copy'; Url='https://blooaquastudio.org/cdn/shop/files/ZcKS3PZx1666283680-776x776.jpg?v=1745418469&width=1946'},

  @{Product='07154_YGG-135_50mm_Diffuser'; File='01_50mm_ball_diffuser.jpg'; Source='Accio/TikTok search listing'; Page='https://www.accio.com/plp/bubble-cascade'; Url='https://s.alicdn.com/@sc04/kf/Hd0e7754c1f70470699523da7a2b3e2cd9.jpg_200x200.jpg'},

  @{Product='C5-1144_1p5m_Enhanced'; File='01_damsel_1p5m.png'; Source='Damsel Dubai'; Page='https://damselbiz.com/products/shop-by-category/aquarium-accessories/yee-15m-aquarium-vacuum-gravel-water-filter-pump'; Url='https://damselbiz.com/_next/image?q=75&url=https%3A%2F%2Fdamselbiz.com%2Fuploads%2Fproducts%2F1752534043268.png&w=828'},

  @{Product='YEE-3621_1p7m_Water_Changer'; File='01_main_1p7m.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/files/1_2182cbb7-1f12-49bc-8fac-520373e39263.jpg?v=1683790200&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='02_product_cutout.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/products/f551454621f77394e9f76618e86a9272.jpg?v=1683790253&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='03_2p6m_variant.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/products/492af0828aee8da89dfda7b66654ee3d.jpg?v=1683790264&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='04_shaking_variant.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/products/e2b3893dbd9b8f0b2b8a24d2ff4a6961.jpg?v=1683790274&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='05_simple_variant.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/products/72212091821c0be617486075c9244e30.jpg?v=1683790285&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='06_new_upgrade.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/products/5a814a90af6cc8426b7b6c641de2b83c.jpg?v=1683790291&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='07_thicken_airbag.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/files/2_153b16c8-ffac-46fd-8b1f-6ed42885b78b.jpg?v=1683790347&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='08_valve.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/files/9.jpg?v=1683790347&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='09_handle.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/files/8_70ff273d-557c-4b13-97d1-d2ab8fc5c690.jpg?v=1683790347&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='10_silicone_material.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/files/7_76842fd6-9eb7-4578-8662-f4176fd0618d.jpg?v=1683790348&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='11_one_shake.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/files/6_df05bea2-dd6a-4eb0-94b3-495407e31eb8.jpg?v=1683790348&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='12_multifunction.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/files/5_13646d7c-b379-4501-b3e8-5b86dda6e44a.jpg?v=1683790348&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='13_airbag_closeup.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/files/4_e951bf12-93a7-45b5-80fe-1faecd60c93d.jpg?v=1683790348&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='14_manual_press.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/files/3_4b02ccfa-1608-4b56-9038-df6faeb30445.jpg?v=1683790347&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='15_parameter.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/files/fa1f98aa5625ccb77650852fa8af12cc_jpeg_2200x2200q80_jpg_656b3813-b6a2-46b0-8242-50e3ba458543.webp?v=1683791958&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='16_hose_clamp.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://ultimateaquasg.com/cdn/shop/files/cbfbf4faf76d0540fcef38196583c227_jpeg_2200x2200q80_jpg_c9f0d50b-6d69-4b56-8e12-4b0ac8d91890.webp?v=1683791959&width=1946'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='17_blue_version.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://cdn.shopify.com/s/files/1/0756/5842/8716/files/YEEAquariumWaterChanger_FishTankCleaningTool_AquariumGlassCleanerWithEasyHandlingForACleanFishTank_feature.webp?v=1683791434'},
  @{Product='YEE-3621_1p7m_Water_Changer'; File='18_silicone_tube.jpg'; Source='Ultimate Aqua SG'; Page='https://ultimateaquasg.com/products/yee-aquarium-water-changer-fish-tank-cleaning-tool-aquarium-glass-cleaner-with-easy-handling-for-a-clean-fish-tank'; Url='https://cdn.shopify.com/s/files/1/0756/5842/8716/files/44402fe5b83df76097ae11b73bdd609e_jpeg_2200x2200q80_jpg.webp?v=1683791562'}
)

$headers = @{
  'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  'Accept' = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
}

$records = @()
foreach ($image in $images) {
  $dir = Join-Path $root $image.Product
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $out = Join-Path $dir $image.File
  $status = 'downloaded'
  $bytes = 0
  try {
    if (Test-Path -LiteralPath $out) {
      $bytes = (Get-Item -LiteralPath $out).Length
    } else {
      Invoke-WebRequest -Uri $image.Url -OutFile $out -Headers $headers -TimeoutSec 30
      $bytes = (Get-Item -LiteralPath $out).Length
    }
  } catch {
    $status = "failed: $($_.Exception.Message)"
  }
  $records += [pscustomobject]@{
    Product = $image.Product
    File = $image.File
    Status = $status
    Bytes = $bytes
    Source = $image.Source
    Page = $image.Page
    ImageUrl = $image.Url
  }
}

$records | Export-Csv -NoTypeInformation -Encoding UTF8 -Path (Join-Path $root 'sources.csv')

$rows = foreach ($record in $records) {
  $rel = if ($record.Status -eq 'downloaded') { "$($record.Product)/$($record.File)" } else { '' }
  $img = if ($rel) { "<a href='$rel'><img src='$rel' alt='$($record.Product)'></a>" } else { "<span class='failed'>فشل التحميل</span>" }
  @"
      <article class="card">
        $img
        <h3>$($record.Product)</h3>
        <p>$($record.File)</p>
        <p class="meta">$($record.Source)</p>
        <p><a href="$($record.Page)">صفحة المنتج</a></p>
        <p><a href="$($record.ImageUrl)">رابط الصورة الأصلي</a></p>
        <p class="meta">$($record.Status)</p>
      </article>
"@
}

$html = @"
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>المنتجات - كل الصور من الإنترنت</title>
  <style>
    body { margin: 0; font-family: Tahoma, Arial, sans-serif; background: #f6f7f9; color: #151b23; }
    main { max-width: 1440px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .note { color: #5f6b7a; margin: 0 0 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
    .card { background: #fff; border: 1px solid #d9dee7; border-radius: 8px; padding: 10px; }
    img { display: block; width: 100%; height: 210px; object-fit: contain; background: #fff; border: 1px solid #e4e8ef; }
    h3 { direction: ltr; text-align: left; font-size: 14px; margin: 10px 0 4px; }
    p { margin: 4px 0; font-size: 12px; overflow-wrap: anywhere; }
    a { color: #185abc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .meta { color: #64748b; direction: ltr; text-align: left; }
    .failed { color: #b42318; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>المنتجات - كل الصور التي وجدتها</h1>
    <p class="note">كل الصور هنا محمّلة من روابط الإنترنت فقط، ومقسمة حسب المنتج. افتح الصورة أو رابطها الأصلي حتى تختار المناسب.</p>
    <section class="grid">
$($rows -join "`n")
    </section>
  </main>
</body>
</html>
"@

Set-Content -Path (Join-Path $root 'index.html') -Value $html -Encoding UTF8

$records | Group-Object Product | Sort-Object Name | Select-Object Name, Count

