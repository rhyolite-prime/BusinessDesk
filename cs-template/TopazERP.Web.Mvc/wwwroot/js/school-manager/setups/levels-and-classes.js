const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            classList: [],
            levelList: [],
            streamList: [],
            levelClassMap: {},
            classTermList: [],
            actualLevelList: [],
            levelClassList: [],
        }
    },
    methods: {
        formatDate(dateInput) {
            return moment(dateInput).format("DD-MMM-YYYY");
        },
        getSetupData() {
            return Promise.all([
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get(`/jsonDataSample/actualLevels.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllLevels/'),
            ]).then(([classes, streams, levelClasses, actualLevels, levels]) => {
                this.classList = classes.data;
                this.streamList = streams.data;
                this.levelClassList = levelClasses.data;
                this.actualLevelList = actualLevels.data;
                this.levelList = levels.data;

                this.levelClassMap = {};
                this.levelList.forEach(level => {
                    level.levelClass = [];
                    level.levelId = level.id;
                    this.levelClassMap[level.id] = level.levelClass.map(clas => {
                        clas.levelId = level.id;
                        this.levelClassList.push(clas);
                        this.levelId = level.id;
                        return clas
                    });
                });

                this.dataTable(this.levelList);
            }).catch(err => {
                this.toastHandler('error', 'Unable to load js.');
            });
        },
        dataTable(responseData) {
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
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", headerText: "id", width: 25, visible: false, isPrimaryKey: true,  },
                    { field: "levelName", headerText: "Level Name", validationRules: { required: true, minlength: 1 }, width: 75 },
                    { field: "ordinal", headerText: "Ordinal Level", defaultValue: 1, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 0 }, validationRules: { required: true, }, width: 75 },
                    { field: "accessPerformanceForm", headerText: "Access Performance Form", width: 60, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean,type: "boolean"},
                    {
                        // replace the existing actualLevelId column
                        field: "actualLevelId",
                        headerText: "Actual Level",
                        validationRules: {required: true},
                        width: 75,
                        editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left,  dataSource: this.actualLevelList
                    },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },
                ],
                childGrid: {
                    // use the Vue array so the child grid can filter by queryString
                    dataSource: this.levelClassList,
                    queryString: "levelId",
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
                        {
                            field: "classId",
                            headerText: "Class",
                            validationRules: {required: true},
                            width: 75,
                            editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left,  dataSource: this.classList
                        },
                        {
                            field: "streamId",
                            headerText: "Stream",
                            validationRules: {required: true},
                            width: 75,
                            editType: ej.Grid.EditingType.Dropdown, foreignKeyField: "id", foreignKeyValue: "name", textAlign: ej.TextAlign.Left,  dataSource: this.streamList
                        },
                        { field: "isHighestClass", headerText: "Is Highest Class", width: 75, displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: "boolean"},
                        { field: "ordinal", headerText: "Ordinal Level", defaultValue: 1, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 0 }, validationRules: { required: true, }, width: 75 },
                        { field: "levelId", visible: false },
                        { field: "tenantId", visible: false }
                    ],
                    endAdd: (args) => {
                        if (!args.data.levelId || args.data.levelId === this.emptyGuid) {
                            args.data.levelId = this.levelId;
                        }
                        const selectedLevel = this.levelList.find(a => a.id === args.data.levelId);
                        if (selectedLevel) {
                            args.data.levelName = selectedLevel.levelName;
                        } else {
                            args.data.levelName = "unknown";
                        }
                        // class
                        if (!args.data.classId || args.data.classId === this.emptyGuid) {
                            args.data.classId = this.classId;
                        }
                        const selectedClass = this.classList.find(a => a.id === args.data.classId);
                        if (selectedClass) {
                            args.data.className = selectedClass.name;
                        } else {
                            args.data.className = "unknown";
                        }
                        // stream
                        if (!args.data.streamId || args.data.streamId === this.emptyGuid) {
                            args.data.streamId = this.streamId;
                        }
                        const selectedStream = this.streamList.find(a => a.id === args.data.streamId);
                        if (selectedStream) {
                            args.data.streamName = selectedStream.name;
                        } else {
                            args.data.streamName = "unknown";
                        }

                        this.saveLevelClass(args.data);
                    },
                    endEdit: (args) => {
                        if (!args.data.levelId || args.data.levelId === this.emptyGuid) {
                            args.data.levelId = this.levelId;
                        }
                        const selectedLevel = this.levelList.find(a => a.id === args.data.levelId);
                        if (selectedLevel) {
                            args.data.levelName = selectedLevel.levelName;
                        } else {
                            args.data.levelName = "unknown";
                        }
                        // class
                        if (!args.data.classId || args.data.classId === this.emptyGuid) {
                            args.data.classId = this.classId;
                        }
                        const selectedClass = this.classList.find(a => a.id === args.data.classId);
                        if (selectedClass) {
                            args.data.className = selectedClass.name;
                        } else {
                            args.data.className = "unknown";
                        }
                        // stream
                        if (!args.data.streamId || args.data.streamId === this.emptyGuid) {
                            args.data.streamId = this.streamId;
                        }
                        const selectedStream = this.streamList.find(a => a.id === args.data.streamId);
                        if (selectedStream) {
                            args.data.streamName = selectedStream.name;
                        } else {
                            args.data.streamName = "unknown";
                        }

                        this.updateLevelClass(args.data);
                    },
                    endDelete: (args) => {
                        this.delLevelClass(args.data.id);
                    }
                },
                endAdd: async (args) => {
                    if (!args.data.actualLevelId || args.data.actualLevelId === this.emptyGuid) {
                        args.data.actualLevelId = this.actualLevelId;
                    }
                    const selectedLevel = this.actualLevelList.find(a => a.id === args.data.actualLevelId);
                    if (selectedLevel) {
                        args.data.actualLevelName = selectedLevel.name;
                    } else {
                        args.data.actualLevelName = "unknown";
                    }
                    this.saveLevel(args.data);
                },
                endEdit: async (args) => {
                    if (!args.data.actualLevelId || args.data.actualLevelId === this.emptyGuid) {
                        args.data.actualLevelId = this.actualLevelId;
                    }
                    const selectedLevel = this.actualLevelList.find(a => a.id === args.data.actualLevelId);
                    if (selectedLevel) {
                        args.data.actualLevelName = selectedLevel.name;
                    } else {
                        args.data.actualLevelName = "unknown";
                    }
                    this.updateLevel(args.data);
                },
                endDelete: (args) => {
                    this.delLevel(args.data.id);
                }
            });
        },

        saveLevel(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SmMainSetups/CreateLevel/', payload).then(response => {

                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save level.');

            });
        },

        updateLevel(payload) {
            axios.post('/SmMainSetups/UpdateLevel/', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'level updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update level.');

            });
        },

        delLevel(id) {

            axios.get('/SmMainSetups/DeleteLevel?id='+id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'level deleted.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to delete level.');

            });
        },

        saveLevelClass(payload) {
            axios.post('/SmMainSetups/CreateLevelClass/', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                }
            }).catch(err => {
                this.toastHandler('error', 'Unable to save Level Class.');
            });
        },


        updateLevelClass(payload) {
            axios.post('/SmMainSetups/UpdateLevelClass/', payload).then(response => {

                this.toastHandler('', 'Level Class updated.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to update Level Class.');

            });
        },

        delLevelClass(id) {

            axios.post('/SmMainSetups/DeleteLevelClass?id='+id).then(response => {

                this.toastHandler('', 'Level Class deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete Level Class.');

            });
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

        uuid() {

            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }
    },

    mounted() {

        this.getSetupData();
    },
});
app.mount('#app');