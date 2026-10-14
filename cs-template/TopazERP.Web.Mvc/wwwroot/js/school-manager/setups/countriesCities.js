const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            countryList: [],
            countryStateList: [],
            citiesList: [],
            countryStateMap: {},
            cityMap: {},
            countryId: '',
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            cityId: '',
            countryStateId: '',
        }
    },
    methods: {
        getSetupData() {
            return Promise.all([
                axios.get(`/jsonDataSample/countries.json?v=${new Date().getTime()}`),
                axios.get('/SharedResource/GetCountryStates/'),
                axios.get('/SharedResource/GetCities/')
            ]).then(([countriesRes, statesRes, citiesRes]) => {
                this.countryList = countriesRes.data;
                this.countryStateList = statesRes.data;
                this.citiesList = citiesRes.data;
                
                this.countryStateMap = {};
                this.countryList.forEach(country => {
                    country.regions = [];
                    country.countryId = country.id;
                    this.countryStateMap[country.id] = country.regions.map(state => {
                    state.countryId = country.id;
                    this.countryStateList.push(state);
                    this.countryId = country.id;
                    return state
                });
            });
                this.cityMap = {};
                this.countryStateList.forEach(state => {
                    state.cities = [];
                    state.countryStateId = state.id;
                    this.countryStateMap[state.id] = state.countryId;
                    this.cityMap[state.id] = state.cities.map(city => {
                    city.countryStateId = state.id;
                    city.countryId = state.countryId;
                    city.countryId = this.countryStateMap[city.countryStateId];
                    this.citiesList.push(city);
                    this.countryStateId = state.id;
                    return city
                });
            });

                // build grids after all data is available
                this.countryTable(this.countryList);
            }).catch(err => {
                this.toastHandler('error', 'Unable to load setups.');
            });
        },
        getCountries() {
            axios.get('/SharedResource/GetCountries').then(response => {

                this.countryList = response.data;
                this.countryTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get natioanlities.');

            });

        },

        countryTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: {
                    pageSize: 20,
                    pageSizeList: [10, 20, 50, 100]
                },
                scrollSettings: { width: "1200px", height: "400px" },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", headerText: "id", width: 25, visible: false, isPrimaryKey: true,  },
                    { field: "name", headerText: "Country", validationRules: { required: true, minlength: 1 }, width: 75 },
                    { field: "code", headerText: "Country Code", validationRules: { required: true, minlength: 1 }, width: 55 },
                    { field: "numericIsoCode", headerText: "Numeric Iso Code", editType: "numericedit", editParams: { decimalPlaces: 0 }, validationRules: { required: true }, width: 55 },
                    { field: "nationality", headerText: "Nationality", validationRules: { required: true, minlength: 1 }, width: 65 },
                   
                ],
                childGrid: {
                    // use the Vue array so the child grid can filter by queryString
                    dataSource: this.countryStateList,
                    queryString: "countryId",
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    pageSettings: {
                        pageSize: 20,
                        pageSizeList: [10, 20, 50, 100]
                    },
                    scrollSettings: { width: "1200px", height: "400px" },
                    editSettings: {
                        allowEditing: true,
                        allowAdding: true,
                        allowDeleting: true,
                        showDeleteConfirmDialog: true
                    },
                    toolbarSettings: {
                        showToolbar: true,
                        toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search]
                    },
                    columns: [
                        { field: "id", isPrimaryKey: true, visible: false, width: 25},
                        { field: "name", headerText: "Region", validationRules: { required: true }, width: 120 },
                        { field: "countryId", visible: false },
                        { field: "tenantId", visible: false }
                    ],
                    childGrid: {
                        // use the Vue array so the child grid can filter by queryString
                        dataSource: this.citiesList,
                        queryString: "countryStateId",
                        allowPaging: true,
                        allowSorting: true,
                        isResponsive: true,
                        pageSettings: {
                            pageSize: 20,
                            pageSizeList: [10, 20, 50, 100]
                        },
                        scrollSettings: { width: "1200px", height: "400px" },
                        editSettings: {
                            allowEditing: true,
                            allowAdding: true,
                            allowDeleting: true,
                            showDeleteConfirmDialog: true
                        },
                        toolbarSettings: {
                            showToolbar: true,
                            toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search]
                        },
                        columns: [
                            { field: "id", isPrimaryKey: true, visible: false, width: 25 },
                            { field: "name", headerText: "City", validationRules: { required: true }, width: 120 },
                            {field: "countryId", visible: false },
                            { field: "countryStateId", visible: false },
                            { field: "tenantId", visible: false }
                        ],
                        endAdd: (args) => {
                            if (!args.data.countryStateId || args.data.countryStateId === this.emptyGuid) {
                                args.data.countryStateId = this.countryStateId;
                            }
                            args.data.countryId = this.countryStateMap[args.data.countryStateId];
                            this.createCity(args.data);
                        },
                        endEdit: (args) => {
                            if (!args.data.countryStateId || args.data.countryStateId === this.emptyGuid) {
                                args.data.countryStateId = this.countryStateId;
                            }
                            args.data.countryId = this.countryStateMap[args.data.countryStateId];
                            this.updateCity(args.data);
                        },
                        endDelete: (args) => {
                            this.delCity(args.data.id);
                        }
                    },
                    endAdd: (args) => {
                        if (!args.data.countryId || args.data.countryId === this.emptyGuid) {
                            args.data.countryId = this.countryId;
                        }
                        this.createCountryState(args.data);
                    },
                    endEdit: (args) => {
                        if (!args.data.countryId || args.data.countryId === this.emptyGuid) {
                            args.data.countryId = this.countryId;
                        }
                        this.updateCountryState(args.data);
                    },
                    endDelete: (args) => {
                        this.delCountryState(args.data.id);
                    }
                },
                endAdd: (args) => {
                    this.saveCountry(args.data);
                },
                endEdit: (args) => {
                    this.updateCountry(args.data);
                },
                endDelete: (args) => {
                    this.delCountry(args.data.id);
                }
            });
        },

        saveCountry(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/SharedResource/CreateCountry', payload).then(response => {

                this.getSetupData();
                this.toastHandler('', 'Nationality saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save nationality.');

            });
        },

        updateCountry(payload) {


            axios.post('/SharedResource/UpdateCountry', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Nationality updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update nationality.');

            });
        },

        delCountry(id) {

            axios.get('/SharedResource/DelCountry?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Nationality deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete currency.');

            });
        },
        // countryStetes
        createCountryState(payload) {

            delete payload.id;
            delete payload.tenantId;
            

            axios.post('/SharedResource/CreateCountryState', payload).then(response => {

                this.getSetupData();
                this.toastHandler('', 'Region saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save region.');

            });
        },

        updateCountryState(payload) {
            axios.post('/SharedResource/UpdateCountryState', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Region updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update region.');

            });
        },

        delCountryState(id) {

            axios.get('/SharedResource/DelCountryState?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Region deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete region.');

            });
        },
        
        // cities
        createCity(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/SharedResource/CreateCity', payload).then(response => {

                this.getSetupData();
                this.toastHandler('', 'City saved.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to save city.');

            });
        },

        updateCity(payload) {
            axios.post('/SharedResource/UpdateCity', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'City updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update city.');

            });
        },

        delCity(id) {

            axios.get('/SharedResource/DelCity?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'City deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete city.');

            });
        },
        
        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

        },
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
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

    mounted() {
        this.getSetupData();
       
    },
});
app.mount('#app');