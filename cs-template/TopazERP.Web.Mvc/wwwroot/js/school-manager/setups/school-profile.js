const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            currentAcademicYearId: '',
            currentAcademicYearName: '',
            currentTermId: '',
            currentTermName: '',
            academicYearList: [],
            termList: [],
            schoolName: '',
            email: '',
            countryStateId: '',
            countryId: '',
            cityId: '',
            cityName: '',
            countryName: '',
            countryStateName: '',
            phoneNo: '',
            address: '',
            senderId: '',
            clientId: '',
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            clientSecret: '',
            registrationNo: '',
            enforceExamSecurity: false,
            schoolDays: 5,
            faxNo: '',
            webLink: '',
            subMetro: '',
            circuit: '',
            mailHostName: '',
            isSSLEnabled: false,
            portNumber: 0,
            primaryEmailAddress: '',
            emailPassword: '',
            companyLogoBase64: '',
            companyLogo: null,
            signature: null,
            signatureBase64: '',
            showSignature: false,
            showSignatureOnResults: false,
            showSignatureOnBills: false,
            showSignatureOnStatement: false,
            showSignatureOnReceipt: false,
            isClassPosition: false,
            isSubjectPosition: false,
            schoolProfileId: '',
            tenantId: '',
            countryList: [],
            countryStateList: [],
            citiesList: [],
            isInitialized: false,
            academicYearTitle: '',
            errors: {},
            currencies: [],
            currencyId: null,

            showSmsModal: false,
            showClientSecret: false,
            

            showEmailModal: false,
            showEmailPassword: false,
            schoolLogo:'',
            signatureUrl:'',

        }
    },

    methods: {
        validateForm() {
            this.errors = {};

            if (!this.schoolName)
                this.errors.schoolName = "School Name is required";

            if (!this.address)
                this.errors.address = "Address is required";

            if (!this.phoneNo)
                this.errors.phoneNo = "Phone No is required";

            if (!this.email)
                this.errors.email = "Email is required";

            if (!this.countryId || this.countryId === this.emptyGuid)
                this.errors.countryId = "Country is required";

            if (!this.currencyId || this.currencyId === this.emptyGuid)
            this.errors.countryId = "Local Currency is required";

            if (!this.currentAcademicYearId || this.currentAcademicYearId === this.emptyGuid)
                this.errors.currentAcademicYearId = "Academic Year is required";

            if (!this.countryStateId || this.countryStateId === this.emptyGuid)
                this.errors.countryStateId = "Region is required";

            if (!this.currentTermId || this.currentTermId === this.emptyGuid)
                this.errors.currentTermId = "Term is required";

            if (!this.schoolDays)
                this.errors.schoolDays = "School Days is required";

            if (!this.cityId || this.cityId === this.emptyGuid)
                this.errors.cityId = "City is required";

            return Object.keys(this.errors).length === 0;
        },
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
        onSignatureFileChange(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                this.signatureBase64 = event.target.result;
            };
            reader.readAsDataURL(file);
        },

        showSignatureUpload() {
            this.$refs.signatureFileInput.click();
        },

        removeSignature() {
            this.signatureBase64 = null;
        },
        getSchoolProfile() {

            axios.get('/SmMainSetups/GetSchoolProfile/').then(response => {

                let schData = response.data;
                
                if(schData !== null){
                    this.isInitialized = true;
                }
                if (this.isInitialized){
                    this.schoolName = schData.schoolName;
                    this.companyLogoBase64 = schData.companyLogo
                        ? "data:image/png;base64," + schData.companyLogo
                        : null;
                    this.signatureBase64 = schData.signature
                        ? "data:image/png;base64," + schData.signature
                        : null;
                    this.schoolProfileId = schData.id;
                    this.tenantId = schData.tenantId;
                    this.email = schData.email;
                    this.phoneNo = schData.phoneNo;
                    this.address = schData.address;
                    this.senderId = schData.senderId;
                    this.clientId = schData.clientId;
                    this.clientSecret = schData.clientSecret;
                    this.registrationNo = schData.registrationNo;
                    this.enforceExamSecurity = schData.enforceExamSecurity;
                    this.schoolDays = schData.schoolDays;
                    this.faxNo = schData.faxNo;
                    this.webLink = schData.website;
                    this.subMetro = schData.subMetro;
                    this.circuit = schData.circuit;
                    this.mailHostName = schData.mailHostName;
                    this.isSSLEnabled = schData.isSSLEnabled;
                    this.portNumber = schData.portNumber? schData.portNumber : 0;
                    this.primaryEmailAddress = schData.primaryEmailAddress;
                    this.emailPassword = schData.emailPassword;
                    this.showSignature = schData.showSignature;
                    this.showSignatureOnResults = schData.showSignatureOnResults;
                    this.showSignatureOnBills = schData.showSignatureOnBills;
                    this.showSignatureOnStatement = schData.showSignatureOnStatement;
                    this.showSignatureOnReceipt = schData.showSignatureOnReceipt;
                    this.isClassPosition = schData.isClassPosition;
                    this.isSubjectPosition = schData.isSubjectPosition;
                    this.countryId = schData.countryId;
                    this.countryStateId = schData.countryStateId;
                    this.cityId = schData.cityId;
                    this.currencyId = schData.currencyId;
                    $("#countryId").ejDropDownList({value: schData.countryId});
                    $("#currencyId").ejDropDownList({value: schData.currencyId});
                    $('#countryStateId').ejDropDownList({value: schData.countryStateId});
                    $('#cityId').ejDropDownList({value: schData.cityId});
                    $('#currentAcademicYearId').ejDropDownList({ value: schData.currentAcademicYearId });
                    $('#currentTermId').ejDropDownList({ value: schData.currentTermId });
                    
                    this.academicYearTitle = schData.currentAcademicYearName;
                    this.schoolLogo = schData.schoolLogo;
                    this.signatureUrl = schData.signatureUrl;
                }

               
            }).catch(err => {

                console.log(err);

            });
        },

        saveProfile() {

            if (!this.validateForm()) {
                this.toastHandler('warning', 'Please fill all required fields.');
                return;
            }

            this.isLoading = true;

            let payload = {};

            payload.currentAcademicYearId = this.currentAcademicYearId;
            payload.currentTermId = this.currentTermId;

            if (this.currentAcademicYearId) {

                let academicYearInfo =
                    this.getAcademicYearDetails(this.currentAcademicYearId);

                if (academicYearInfo) {
                    payload.currentAcademicYearName = academicYearInfo.name;
                } else {
                    payload.currentAcademicYearName = 'Not Set';
                }
            }

            if (this.currentTermId) {

                let termInfo =
                    this.termList.find(t => t.id === this.currentTermId);

                if (termInfo) {
                    payload.currentTermName = termInfo.name;
                } else {
                    payload.currentTermName = 'Not Set';
                }
            }

            payload.schoolName = this.schoolName;
            payload.email = this.email;
            payload.phoneNo = this.phoneNo;
            payload.address = this.address;
            payload.senderId = this.senderId;
            payload.clientId = this.clientId;
            payload.clientSecret = this.clientSecret;
            payload.registrationNo = this.registrationNo;
            payload.enforceExamSecurity = this.enforceExamSecurity;
            payload.schoolDays = this.schoolDays;
            payload.faxNo = this.faxNo;
            payload.website = this.webLink;
            payload.subMetro = this.subMetro;
            payload.circuit = this.circuit;
            payload.mailHostName = this.mailHostName;
            payload.isSSLEnabled = this.isSSLEnabled;
            payload.portNumber = this.portNumber ? this.portNumber : 0;
            payload.primaryEmailAddress = this.primaryEmailAddress;
            payload.emailPassword = this.emailPassword;
            payload.currencyId = this.currencyId;
            payload.schoolLogo = this.schoolLogo;
            payload.signatureUrl = this.signatureUrl;

            payload.companyLogoBase64 = this.companyLogoBase64
                ? this.companyLogoBase64.split(",")[1]
                : null;

            payload.signatureBase64 = this.signatureBase64
                ? this.signatureBase64.split(",")[1]
                : null;

            payload.showSignature = this.showSignature;
            payload.showSignatureOnResults = this.showSignatureOnResults;
            payload.showSignatureOnBills = this.showSignatureOnBills;
            payload.showSignatureOnStatement = this.showSignatureOnStatement;
            payload.showSignatureOnReceipt = this.showSignatureOnReceipt;
            payload.isClassPosition = this.isClassPosition;
            payload.isSubjectPosition = this.isSubjectPosition;

            payload.countryId = this.countryId;
            payload.countryStateId = this.countryStateId;
            payload.cityId = this.cityId;

            if (this.countryId) {

                let countryInfo =
                    this.getCountryDetails(this.countryId);

                payload.countryName = countryInfo
                    ? countryInfo.name
                    : 'Not Set';
            }

            if (this.countryStateId) {

                let stateInfo =
                    this.getCountryStateDetails(this.countryStateId);

                payload.countryStateName = stateInfo
                    ? stateInfo.name
                    : 'Not Set';
            }

            if (this.cityId) {

                let cityInfo =
                    this.getCityDetails(this.cityId);

                payload.cityName = cityInfo
                    ? cityInfo.name
                    : 'Not Set';
            }


            /*
             * ----------------------------------------------------
             * UPDATE ACTIVE ACADEMIC YEAR
             * ----------------------------------------------------
             */

            this.updateAcademicYearStatus(this.currentAcademicYearId)
                .then(() => {

                    /*
                     * ------------------------------------------------
                     * SAVE SCHOOL PROFILE
                     * ------------------------------------------------
                     */

                    if (this.schoolProfileId) {

                        payload.id = this.schoolProfileId;
                        payload.tenantId = this.tenantId;

                        return axios.post(
                            '/SmMainSetups/UpdateSchoolProfile',
                            payload
                        );
                    }
                    else {

                        return axios.post(
                            '/SmMainSetups/CreateSchoolProfile/',
                            payload
                        );
                    }

                })
                .then(response => {

                    this.isLoading = false;

                    if (this.schoolProfileId) {

                        this.toastHandler(
                            '',
                            'School profile info updated.'
                        );

                    } else {

                        this.toastHandler(
                            '',
                            'Profile saved.'
                        );

                        this.getSchoolProfile();
                    }

                })
                .catch(err => {

                    console.error(err);

                    this.isLoading = false;

                    this.toastHandler(
                        'error',
                        'Unable to save school information.'
                    );
                });
        },


        updateAcademicYearStatus(newAcademicYearId) {

            const newAcademicYear = this.getAcademicYearDetails(newAcademicYearId);

            if (!newAcademicYear) {
                return Promise.resolve();
            }

            // Find the currently active academic year
            const oldAcademicYear = this.academicYearList.find(
                year => year.isActive === true && year.id !== newAcademicYearId
            );

            const requests = [];

            // Deactivate old academic year
            if (oldAcademicYear) {

                const oldPayload = {
                    id: oldAcademicYear.id,
                    name: oldAcademicYear.name,
                    startDate: oldAcademicYear.startDate,
                    endDate: oldAcademicYear.endDate,
                    isActive: false,
                    tenantId: this.tenantId
                };

                requests.push(
                    axios.post('/SmMainSetups/UpdateAcademicYear/', oldPayload)
                );
            }

            // Activate selected academic year
            if (!newAcademicYear.isActive) {

                const newPayload = {
                    id: newAcademicYear.id,
                    name: newAcademicYear.name,
                    startDate: newAcademicYear.startDate,
                    endDate: newAcademicYear.endDate,
                    isActive: true,
                    tenantId: this.tenantId
                };

                requests.push(
                    axios.post('/SmMainSetups/UpdateAcademicYear/', newPayload)
                );
            }

            return Promise.all(requests);
        },
        getCurrencies() {

            axios.get('/SharedResource/GetCurrencys/').then(response => {

                this.currencies = response.data;

                $('#currencyId').ejDropDownList({
                    dataSource: this.currencies,
                    width: "100%",
                    watermarkText: "Select Local Currency",
                    fields: { id: "id", text: "currencyName", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.currencyId = args.value || this.emptyGuid;
                    }
                });


            }).catch(err => {

                this.toastHandler('error', 'Unable to get currencies');

            });
        },
        getAcademicYears() {

            axios.get('/SmMainSetups/ListAllAcademicYears').then(response => {

                this.academicYearList = response.data;
                
                $('#currentAcademicYearId').ejDropDownList({
                    dataSource: this.academicYearList,
                    width: "100%",
                    watermarkText: "Select Academic Year",
                    fields: { id: "id", text: "name", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.currentAcademicYearId = args.value || this.emptyGuid;
                    }
                });


            }).catch(err => {

                this.toastHandler('error', 'Unable to get academic years.');

            });
        },
        getTerms() {

            axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`).then(response => {

                this.termList = response.data;
                
                $('#currentTermId').ejDropDownList({
                    dataSource: this.termList,
                    width: "100%",
                    watermarkText: "Select Term",
                    fields: { id: "id", text: "name", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.currentTermId = args.value || this.emptyGuid;
                    }
                });


            }).catch(err => {

                this.toastHandler('error', 'Unable to get terms.');

            });
        },
        getAcademicYearDetails(id) {

            return this.academicYearList.find(a => a.id === id);
        },
        getNationalities() {
            axios.all([
                axios.get(`/jsonDataSample/countries.json?v=${new Date().getTime()}`),
                axios.get('/SharedResource/GetCountryStates/'),
                axios.get('/SharedResource/GetCities/')
            ]).then(([countriesRes, statesRes, citiesRes]) => {
                this.countryList = countriesRes.data;
                this.countryStateList = statesRes.data;
                this.citiesList = citiesRes.data;

              
                $('#countryId').ejDropDownList({
                    dataSource: this.countryList,
                    width: "100%",
                    watermarkText: "Select Country",
                    fields: { id: "id", text: "name", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.countryId = args.value || this.emptyGuid;
                    }
                });
                $('#countryStateId').ejDropDownList({
                    dataSource: this.countryStateList,
                    width: "100%",
                    watermarkText: "Select State/Region",
                    fields: { id: "id", text: "name", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.countryStateId = args.value || this.emptyGuid;
                    }
                });
                $('#cityId').ejDropDownList({
                    dataSource: this.citiesList,
                    width: "100%",
                    watermarkText: "Select City",
                    fields: { id: "id", text: "name", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.cityId = args.value || this.emptyGuid;
                    }
                });
                
            }).catch(err => {
                this.toastHandler('error', 'Unable to load nationalities.');
            });
        },
        getCountryDetails(id) {

            return this.countryList.find(c => c.id === id);
        },
        getCountryStateDetails(id) {

            return this.countryStateList.find(s => s.id === id);
        },
        getCityDetails(id) {

            return this.citiesList.find(c => c.id === id);
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
        countryId(val) {
            // build filtered states for selected country
          if(this.isInitialized === false){
              let filteredStates;
              if (val && val !== this.emptyGuid) {
                  filteredStates = this.countryStateList.filter(s => s.countryId === val);
              } else {
                  // show all states when no country selected, or use [] to clear
                  filteredStates = this.countryStateList;
              }

              // reinitialize / update the countryState dropdown with filtered data
              $('#countryStateId').ejDropDownList({
                  dataSource: filteredStates,
                  width: "100%",
                  watermarkText: "Select State/Region",
                  fields: { id: "id", text: "name", value: "id" },
                  enableFilterSearch: true,
                  change: (args) => {
                      this.countryStateId = args.value || this.emptyGuid;
                  }
              });

              // keep currently selected state only if it belongs to the filtered list
              const hasCurrentState = filteredStates.some(s => s.id === this.countryStateId);
              if (!hasCurrentState) {
                  this.countryStateId = this.emptyGuid;
                  $('#countryStateId').ejDropDownList({ value: this.countryStateId });
              }
          }
        },
        // when state changes, filter cities and preserve selected city if valid
        countryStateId(val) {
          if(this.isInitialized === false){
              if (val && val !== this.emptyGuid) {
                  const filteredCities = this.citiesList.filter(c => c.countryStateId === val);

                  $('#cityId').ejDropDownList({
                      dataSource: filteredCities,
                      width: "100%",
                      watermarkText: "Select City",
                      fields: { id: "id", text: "name", value: "id" },
                      enableFilterSearch: true,
                      change: (args) => {
                          this.cityId = args.value || this.emptyGuid;
                      }
                  });

                  const hasCurrentCity = filteredCities.some(c => c.id === this.cityId);
                  if (!hasCurrentCity) {
                      this.cityId = this.emptyGuid;
                      $('#cityId').ejDropDownList({ value: this.cityId });
                  }
              } else {
                  // no state selected -> show all cities or clear as needed
                  $('#cityId').ejDropDownList({
                      dataSource: this.citiesList,
                      width: "100%",
                      watermarkText: "Select City",
                      fields: { id: "id", text: "name", value: "id" },
                      enableFilterSearch: true,
                      change: (args) => {
                          this.cityId = args.value || this.emptyGuid;
                      }
                  });
              }
          }
        },

    },
    mounted() {
        this.getAcademicYears();
        this.getTerms();
        this.getNationalities();
        this.getCurrencies();
        this.getSchoolProfile();
    },

});
app.mount('#app');