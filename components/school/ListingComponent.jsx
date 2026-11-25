/* eslint-disable react-hooks/exhaustive-deps */
/**
 * Copyright © 2023, School CRM Inc. ALL RIGHTS RESERVED.
 *
 * This software is the confidential information of School CRM Inc., and is licensed as
 * restricted rights software. The use, reproduction, or disclosure of this software is subject to
 * restrictions set forth in your license agreement with School CRM.
*/

import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "@/lib/routerAdapter";
import { useSelector, useDispatch } from "react-redux";
import { Plus } from "lucide-react";

import API from "../../apis";
import Search from "../common/Search";
import ServerPaginationGrid from '../common/Datagrid';
import SchoolDossierModal from "./SchoolDossierModal";

import { datagridColumns } from "./SchoolConfig";
import { setFormAmenities } from "../../redux/actions/AmenityAction";
import { setAllPaymentMethods } from "../../redux/actions/PaymentMethodAction";
import { setAllClasses } from "../../redux/actions/ClassAction";
import { setAllSections } from "../../redux/actions/SectionAction";
import { setAllSubjects } from "../../redux/actions/SubjectAction";
import { setMenuItem } from "../../redux/actions/NavigationAction";
import { setListingSchools } from "../../redux/actions/SchoolAction";
import { useCommon } from "../hooks/common";
import { Utility } from "../utility";

import PropTypes from "prop-types";

const pageSizeOptions = [10, 20, 50];

const ListingComponent = ({ rolePriority = null }) => {

    const [openModal, setOpenModal] = useState(false);
    const [selectedSchoolId, setSelectedSchoolId] = useState(null);
    const [schoolDetail, setSchoolDetail] = useState(null);
    const [countryData, setCountryData] = useState([]);
    const [stateData, setStateData] = useState([]);
    const [cityData, setCityData] = useState([]);

    const selected = useSelector(state => state.menuItems.selected);
    const formAmenitiesInRedux = useSelector(state => state.allFormAmenities);
    const allPaymentMethods = useSelector(state => state.allPaymentMethods);
    const allClasses = useSelector(state => state.allClasses);
    const allSections = useSelector(state => state.allSections);
    const allSubjects = useSelector(state => state.allSubjects);
    const { listData, loading } = useSelector(state => state.listingSchools);

    const navigateTo = useNavigate();
    const dispatch = useDispatch();
    const { state } = useLocation();
    let locationId = state?.id;

    const [searchFlag, setSearchFlag] = useState({ search: false, searching: false });
    const [oldPagination, setOldPagination] = useState();
    const [reloadBtn, setReloadBtn] = useState(null);

    const { getPaginatedData } = useCommon();
    const { findMultipleById, fetchAndSetAll, toastAndNavigate } = Utility();

    useEffect(() => {
        setReloadBtn(document.getElementById("reload-btn"));
    }, []);

    useEffect(() => {
        dispatch(setMenuItem("School"));
    }, []);

    const populateData = useCallback(id => {
        const paths = [`/get-by-pk/school/${id}`, `/get-address/school/${id}`, `/get-image/school/${id}`];

        API.CommonAPI.multipleAPICall("GET", paths)
            .then(responses => {
                if (responses[0]?.data?.data) {
                    responses[0].data.data.amenities = findMultipleById(responses[0].data.data?.amenities, formAmenitiesInRedux?.listData?.rows);
                    responses[0].data.data.payment_methods = findMultipleById(responses[0].data.data?.payment_methods, allPaymentMethods?.listData);
                }
                API.SchoolAPI.getSchoolClasses(id)
                    .then(res => {
                        const rawImg = responses[2]?.data?.data;
                        const imagesList = Array.isArray(rawImg) ? rawImg : (rawImg ? [rawImg] : []);
                        const dataObj = {
                            schoolData: {
                                schoolData: responses[0]?.data?.data,
                                selectedClass: res?.data
                            },
                            addressData: responses[1]?.data?.data,
                            imageData: imagesList
                        };
                        setSchoolDetail(dataObj);
                    })
                    .catch(err => {
                        toastAndNavigate(dispatch, true, "error", err?.response?.data?.msg || "Error fetching school classes", navigateTo, 0);
                    });
            })
            .catch(err => {
                toastAndNavigate(dispatch, true, "error", err?.response?.data?.msg || "Error fetching school data", navigateTo, 0);
            });
    }, [formAmenitiesInRedux?.listData?.rows, allPaymentMethods?.listData]);

    useEffect(() => {
        if (!formAmenitiesInRedux?.listData?.rows?.length) {
            getPaginatedData(0, 50, setFormAmenities, API.AmenityAPI);
        }
        if (!allPaymentMethods?.listData?.length) {
            fetchAndSetAll(dispatch, setAllPaymentMethods, API.PaymentMethodAPI);
        }
        if (!allClasses?.listData?.length) {
            fetchAndSetAll(dispatch, setAllClasses, API.ClassAPI);
        }
        if (!allSections?.listData?.length) {
            fetchAndSetAll(dispatch, setAllSections, API.SectionAPI);
        }
        if (!allSubjects?.listData?.length) {
            fetchAndSetAll(dispatch, setAllSubjects, API.SubjectAPI);
        }
    }, []);

    const activeId = selectedSchoolId || locationId;

    useEffect(() => {
        if (activeId) {
            populateData(activeId);

            if (!countryData.length) {
                API.CountryAPI.getCountries()
                    .then(countries => {
                        if (countries.status === 'Success') {
                            setCountryData(countries.data.list);
                        }
                    })
                    .catch(() => {});
            }

            if (!stateData.length) {
                API.StateAPI.getAllStates()
                    .then(states => {
                        if (states.status === 'Success') {
                            setStateData(states.data.rows);
                        }
                    })
                    .catch(() => {});
            }

            if (!cityData.length) {
                API.CityAPI.getAllCities()
                    .then(cities => {
                        if (cities.status === 'Success') {
                            setCityData(cities.data.rows);
                        }
                    })
                    .catch(() => {});
            }
        }
    }, [activeId]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-100 dark:border-[#1a1a1a] shadow-sm p-5">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl sm:text-2xl font-extrabold font-display text-slate-800 dark:text-white tracking-tight capitalize leading-tight">School Desk</h2>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="w-full sm:w-auto">
                            <Search
                                action={setListingSchools}
                                api={API.SchoolAPI}
                                getSearchData={getPaginatedData}
                                oldPagination={oldPagination}
                                reloadBtn={reloadBtn}
                                setSearchFlag={setSearchFlag}
                            />
                        </div>

                        <button
                            onClick={() => navigateTo(`/${(selected || 'school').toLowerCase()}/create`)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all duration-200 whitespace-nowrap cursor-pointer"
                        >
                            <Plus className="w-5 h-5" />
                            Create New {selected || 'School'}
                        </button>
                    </div>
                </div>
            </div>

            <ServerPaginationGrid
                action={setListingSchools}
                api={API.SchoolAPI}
                getQuery={getPaginatedData}
                columns={datagridColumns(setOpenModal, setSelectedSchoolId, navigateTo)}
                rows={listData?.rows || listData?.data || []}
                count={listData?.count || 0}
                loading={loading}
                selected={selected}
                pageSizeOptions={pageSizeOptions}
                setOldPagination={setOldPagination}
                searchFlag={searchFlag}
                setSearchFlag={setSearchFlag}
            />

            <SchoolDossierModal
                open={openModal}
                setOpen={(val) => {
                    setOpenModal(val);
                    if (!val) setSelectedSchoolId(null);
                }}
                detail={schoolDetail}
                countryData={countryData}
                stateData={stateData}
                cityData={cityData}
                allClasses={allClasses?.listData || []}
                allSections={allSections?.listData || []}
                allSubjects={allSubjects?.listData || []}
                allAmenities={formAmenitiesInRedux?.listData?.rows || []}
                allPaymentMethods={allPaymentMethods?.listData || []}
            />
        </div>
    );
};

ListingComponent.propTypes = {
    rolePriority: PropTypes.number
};

export default ListingComponent;
