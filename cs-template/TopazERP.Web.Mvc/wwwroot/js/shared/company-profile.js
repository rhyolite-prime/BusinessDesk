Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        nationalityList: [],
        currencyList: [],
        payload: {},
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        companyName: '',
        countryId: '',
        cityName: '',
        phoneNo: '',
        companyTin: '',
        email: '',
        address: '',
        firstMonthOfFiscalYear: 1,
        senderId: '',
        clientId: '',
        clientSecret: '',
        employerSocialSecurityNo: '',
        socialSecurityFundEmployerRate: null,
        socialSecurityFundEmployeeRate: null,
        paySocialSecurityFund: false,
        providentFundEmployeeRate: null,
        providentFundEmployerRate: null,
        providentFundTreatAsSocialSecurityFund: false,
        payProvidentFund: false,
        providentFundTaxEmployerPortion: false,
        secondProvidentEmployeeRate: null,
        secondProvidentEmployerRate: null,
        paySecondProvidentOrOthers: false,
        treatSecondProvidentAsSsf: false,
        secondProvidentTaxEmployerPortion: false,
        overtimePercentageOnBasicSalary: false,
        overtimePercentageOnDailyWage: false,
        mailHostName: '',
        primaryEmailAddress: '',
        emailPassword: '',
        portNumber: 0,
        isSSLEnabled: false,
        companyProfileId: '',
        defaultCurrenyId: '',
        isTaxLeviesInclusive: false,
        taxLevyList: [],
        enforceOu: false,
        companyLogoBase64: '',
        companyLogo: null,
        tenantId: '',
    },
    validations() {

        return {

            companyName: {
                required
            },
            phoneNo: {
                required
            },
            email: {
                required
            },
            address: {
                required
            },
            
        }

    },
    methods: {
        onFileChange(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                this.companyLogoBase64 = event.target.result;
            };
            reader.readAsDataURL(file);
        },

        showUpload() {
            this.$refs.fileInput.click();
        },

        removeLogo() {
            this.companyLogoBase64 = null;
        },
         
        getBusinessProfile() {

            axios.get('/SharedResource/GetBusinessProfile').then(response => {

                if (response.data) {

                    let businessProfile = response.data;
                    
                    console.log(businessProfile);

                    this.companyName = businessProfile.companyName;
                    this.countryId = businessProfile.countryId;
                    this.cityName = businessProfile.cityName;
                    this.phoneNo = businessProfile.phoneNo;
                    this.companyTin = businessProfile.companyTin;
                    this.email = businessProfile.email;
                    this.address = businessProfile.address;
                    this.firstMonthOfFiscalYear = businessProfile.firstMonthOfFiscalYear;
                    this.senderId = businessProfile.senderId;
                    this.clientId = businessProfile.clientId;
                    this.clientSecret = businessProfile.clientSecret;
                    this.employerSocialSecurityNo = businessProfile.employerSocialSecurityNo;
                    this.socialSecurityFundEmployerRate = businessProfile.socialSecurityFundEmployerRate;
                    this.socialSecurityFundEmployeeRate = businessProfile.socialSecurityFundEmployeeRate;
                    this.paySocialSecurityFund = businessProfile.paySocialSecurityFund;
                    this.providentFundEmployeeRate = businessProfile.providentFundEmployeeRate;
                    this.providentFundEmployerRate = businessProfile.providentFundEmployerRate;
                    this.providentFundTreatAsSocialSecurityFund = businessProfile.providentFundTreatAsSocialSecurityFund;
                    this.payProvidentFund = businessProfile.payProvidentFund;
                    this.providentFundTaxEmployerPortion = businessProfile.providentFundTaxEmployerPortion;
                    this.secondProvidentEmployeeRate = businessProfile.secondProvidentEmployeeRate;
                    this.secondProvidentEmployerRate = businessProfile.secondProvidentEmployerRate;
                    this.paySecondProvidentOrOthers = businessProfile.paySecondProvidentOrOthers;
                    this.treatSecondProvidentAsSsf = businessProfile.treatSecondProvidentAsSsf;
                    this.secondProvidentTaxEmployerPortion = businessProfile.secondProvidentTaxEmployerPortion;
                    this.overtimePercentageOnBasicSalary = businessProfile.overtimePercentageOnBasicSalary;
                    this.overtimePercentageOnDailyWage = businessProfile.overtimePercentageOnDailyWage;
                    this.mailHostName = businessProfile.mailHostName;
                    this.primaryEmailAddress = businessProfile.primaryEmailAddress;
                    this.emailPassword = businessProfile.emailPassword;
                    this.portNumber = businessProfile.portNumber;
                    this.isSSLEnabled = businessProfile.isSSLEnabled;
                    this.companyProfileId = businessProfile.id;
                    this.defaultCurrenyId = businessProfile.defaultCurrenyId;
                    this.isTaxLeviesInclusive = businessProfile.isTaxLeviesInclusive;
                    this.enforceOu = businessProfile.enforceOu;
                    this.companyLogoBase64 = businessProfile.companyLogo  ? "data:image/png;base64," + businessProfile.companyLogo : null;
                    this.tenantId = businessProfile.tenantId;

                }

            }).catch(err => {

                console.log(err);

            });
        },

        getNationalities() {

            axios.get(`/jsonDataSample/countries.json?v=${new Date().getTime()}`)
                .then(response => {

                this.nationalityList = response.data;
                
            }).catch(err => {

                this.toastHandler('error', 'Unable to get nationalities.');

            });
        },

        getCurrency() {

            axios.get('/SharedResource/GetCurrencys').then(response => {

                this.currencyList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get currency.');

            });
        },
        
        //get tax levies
        getTaxLevies() {
                
                axios.get('/SharedResource/GetTaxLevies').then(response => {
    
                    this.taxLevyList = response.data;
    
                }).catch(err => {
    
                    this.toastHandler('error', 'Unable to get tax levies.');
    
                });
            },

        saveProfile() {

            this.$v.$touch();

            if (this.$v.$invalid) {

                for (let key in Object.keys(this.$v)) {

                    const input = Object.keys(this.$v)[key];

                    if (this.$v[input].$error) {

                        this.$refs[input].focus();

                        break;
                    }

                }

                return;
            }  


            let payload = {};

            this.isLoading = true;

            payload.companyName = this.companyName;
            payload.countryId = !this.countryId ? this.emptyGuid : this.countryId;
            payload.cityName = this.cityName;
            payload.phoneNo = this.phoneNo;
            payload.companyTin = this.companyTin;
            payload.email = this.email;
            payload.address = this.address;
            payload.firstMonthOfFiscalYear = this.firstMonthOfFiscalYear;
            payload.senderId = this.senderId;
            payload.clientId = this.clientId;
            payload.clientSecret = this.clientSecret;
            payload.employerSocialSecurityNo = this.employerSocialSecurityNo;
            payload.socialSecurityFundEmployerRate = !this.socialSecurityFundEmployerRate ? 0 : this.socialSecurityFundEmployerRate;
            payload.socialSecurityFundEmployeeRate = !this.socialSecurityFundEmployeeRate ? 0 : this.socialSecurityFundEmployeeRate;
            payload.paySocialSecurityFund = this.paySocialSecurityFund;
            payload.providentFundEmployeeRate = !this.providentFundEmployeeRate ? 0 : this.providentFundEmployeeRate;
            payload.providentFundEmployerRate = !this.providentFundEmployerRate ? 0 : this.providentFundEmployerRate;
            payload.providentFundTreatAsSocialSecurityFund = this.providentFundTreatAsSocialSecurityFund;
            payload.payProvidentFund = this.payProvidentFund;
            payload.providentFundTaxEmployerPortion = this.providentFundTaxEmployerPortion;
            payload.secondProvidentEmployeeRate = !this.secondProvidentEmployeeRate ? 0 : this.secondProvidentEmployeeRate;
            payload.secondProvidentEmployerRate = !this.secondProvidentEmployerRate ? 0 : this.secondProvidentEmployerRate;
            payload.paySecondProvidentOrOthers = this.paySecondProvidentOrOthers;
            payload.treatSecondProvidentAsSsf = this.treatSecondProvidentAsSsf;
            payload.secondProvidentTaxEmployerPortion = this.secondProvidentTaxEmployerPortion;
            payload.overtimePercentageOnBasicSalary = this.overtimePercentageOnBasicSalary;
            payload.overtimePercentageOnDailyWage = this.overtimePercentageOnDailyWage;
            payload.mailHostName = this.mailHostName;
            payload.primaryEmailAddress = this.primaryEmailAddress;
            payload.emailPassword = this.emailPassword;
            payload.portNumber = this.portNumber;
            payload.isSSLEnabled = this.isSSLEnabled;
            payload.defaultCurrenyId = !this.defaultCurrenyId ? this.emptyGuid : this.defaultCurrenyId;
            payload.isTaxLeviesInclusive = this.isTaxLeviesInclusive;
            payload.companyLogoBase64 = this.companyLogoBase64
                ? this.companyLogoBase64.split(",")[1]
                : null;
            payload.enforceOu = this.enforceOu;

            if (this.companyProfileId) {

                payload.id = this.companyProfileId;
                payload.tenantId = this.tenantId;

                axios.post('/SharedResource/UpdateBusinessProfile', payload).then(response => {

                    this.toastHandler('', 'Business profile info updated.');

                    this.isLoading = false;

                }).catch(err => {

                    this.toastHandler('error', 'Unable to update business info.');
                    this.isLoading = false;

                });
            }
            else
            {

                axios.post('/SharedResource/CreateBusinessProfile', payload).then(response => {

                    this.toastHandler('', 'Business profile info saved.');

                    this.isLoading = false;

                }).catch(err => {

                    this.toastHandler('error', 'Unable to save business profile.');
                    this.isLoading = false;

                });

            }
            
        },

       
        toastHandler(type, message = 'An unexpected error occurred.') {

            //display alert with 
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
            };

            switch (type) {

                case 'warning':
                    toastr.warning('', message);
                    break;
                case 'error':
                    toastr.error('', message);
                    break;
                default:
                    toastr.success('', message);
                    break;
            }

        },


    },
    watch: {



    },
    created() {

        this.getBusinessProfile();

        this.getNationalities();

        this.getCurrency();
        
        console.log("companyProfileId changed");

    },
});