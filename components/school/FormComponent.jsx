/* eslint-disable react-hooks/exhaustive-deps */
/**
 * Copyright © 2023, School CRM Inc. ALL RIGHTS RESERVED.
 *
 * This software is the confidential information of School CRM Inc., and is licensed as
 * restricted rights software. The use, reproduction, or disclosure of this software is subject to
 * restrictions set forth in your license agreement with School CRM.
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "@/lib/routerAdapter";
import { useDispatch, useSelector } from "react-redux";
import { Building2, Save, RotateCcw, ArrowLeft, Loader2 } from "lucide-react";

import API from "../../apis";
import AddressFormComponent from "../address/AddressFormComponent";
import ImagePicker from "../image/ImagePicker";
import Loader from "../common/Loader";
import Toast from "../common/Toast";
import SchoolFormComponent from "./SchoolFormComponent";

import { setAllClasses } from "../../redux/actions/ClassAction";
import { setAllSections } from "../../redux/actions/SectionAction";
import { setAllSubjects } from "../../redux/actions/SubjectAction";
import { setAllPaymentMethods } from "../../redux/actions/PaymentMethodAction";
import { setFormAmenities } from "../../redux/actions/AmenityAction";
import { setMenuItem } from "../../redux/actions/NavigationAction";
import { useCommon } from "../hooks/common";
import { Utility } from "../utility";

import formBg from "../assets/formBg.png";

const ENV = process.env;

const FormComponent = () => {
    const [title, setTitle] = useState("Create");
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPopulating, setIsPopulating] = useState(false);

    const [formData, setFormData] = useState({
        schoolData: { values: null, validated: false },
        addressData: { values: null, validated: false },
        imageData: { values: null, validated: false },
        bannerImageData: { values: null, validated: false }
    });
    const [updatedValues, setUpdatedValues] = useState(null);
    const [deletedImage, setDeletedImage] = useState([]);
    const [previewDisplay, setPreviewDisplay] = useState([]);
    const [deletedBannerImage, setDeletedBannerImage] = useState([]);
    const [previewBanner, setPreviewBanner] = useState([]);
    const [updatedDisplayImage, setUpdatedDisplayImage] = useState([]);
    const [updatedBannerImage, setUpdatedBannerImage] = useState([]);

    const [dirty, setDirty] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [reset, setReset] = useState(false);

    const allClasses = useSelector(state => state.allClasses);
    const allSections = useSelector(state => state.allSections);
    const allSubjects = useSelector(state => state.allSubjects);
    const formAmenitiesInRedux = useSelector(state => state.allFormAmenities);
    const allPaymentMethods = useSelector(state => state.allPaymentMethods);
    const selected = useSelector(state => state.menuItems.selected);
    const toastInfo = useSelector(state => state.toastInfo);

    const schoolFormRef = useRef();
    const addressFormRef = useRef();
    const imageFormRef = useRef();
    const bannerImageFormRef = useRef();

    const navigateTo = useNavigate();
    const dispatch = useDispatch();
    const userParams = useParams();

    const { pathname, state } = useLocation();
    const { getPaginatedData } = useCommon();
    const { createSchoolCode, formatImageName, getLocalStorage, getIdsFromObject, findMultipleById,
        fetchAndSetAll, toastAndNavigate } = Utility();

    const isCreate = pathname?.includes("/create") || pathname?.endsWith("/create");
    let id = isCreate ? undefined : (userParams?.id || state?.id || (pathname?.includes("/update/") ? pathname.split("/update/")[1]?.split("/")[0] : undefined));

    useEffect(() => {
        const selectedMenu = getLocalStorage("menu");
        if (selectedMenu?.selected) {
            dispatch(setMenuItem(selectedMenu.selected));
        }
    }, []);

    useEffect(() => {
        if (isCreate) {
            setTitle("Create");
            setUpdatedValues(null);
            setUpdatedDisplayImage([]);
            setUpdatedBannerImage([]);
            setPreviewDisplay([]);
            setPreviewBanner([]);
            setDeletedImage([]);
            setDeletedBannerImage([]);
            setDirty(false);
            setSubmitted(false);
            setReset(true);
        }
    }, [isCreate]);

    const updateImageAndClassData = useCallback(async formData => {
        try {
            // Update class and section mappings if school basic data was dirty
            if (formData.schoolData.dirty && formData.schoolData.values?.sections) {
                // Delete existing mappings for this school
                await API.SchoolAPI.deleteFromMappingTable({ school_id: id });

                const updatedClassData = formData.schoolData.values.sections.map(async (innerArray, classIndex) => {
                    const schoolClass = formData.schoolData.values.classes[classIndex] || 0;
                    const classFee = formData.schoolData.values.classes_fee[classIndex] || 0;
                    const classCapacity = formData.schoolData.values.classes_capacity[classIndex] || 0;
                    const classLateFee = formData.schoolData.values.classes_late_fee[classIndex] || 0;
                    const classLateFeeDuration = formData.schoolData.values.classes_late_fee_duration[classIndex] || 0;

                    return Promise.all(innerArray.map(async (sectionData, sectionIndex) => {
                        const subjectArray = formData.schoolData.values.subjects[classIndex] ? formData.schoolData.values.subjects[classIndex][sectionIndex] : [];
                        return API.SchoolAPI.insertIntoMappingTable(
                            [id, schoolClass, sectionData.section_id || sectionData.id,
                            getIdsFromObject(subjectArray, allSubjects?.listData), classFee, classCapacity, classLateFee,
                            classLateFeeDuration]
                        );
                    }));
                });
                await Promise.all(updatedClassData);
            }

            // Handle Display Image update: only delete old display image if a new one is uploaded or explicitly deleted
            const hasNewDisplayImage = Boolean(formData.imageData?.values?.image && formData.imageData.values.image.length > 0);
            const hasDeletedDisplayImage = Boolean(deletedImage && deletedImage.length > 0);

            if (hasNewDisplayImage || hasDeletedDisplayImage) {
                await API.ImageAPI.deleteImage({
                    parent: "school",
                    parent_id: id,
                    type: "display"
                });
            }

            if (hasNewDisplayImage) {
                await Promise.all(
                    Array.from(formData.imageData.values.image).map(async (image) => {
                        const formattedName = formatImageName(image.name);
                        const res = await API.ImageAPI.uploadImageToSupabase({
                            image: image,
                            folder: `school/${formattedName}`,
                        });
                        if (res?.data?.status === "Success" || res?.data?.data) {
                            await API.ImageAPI.createImage({
                                image_src: res.data.data,
                                school_id: id,
                                parent_id: id,
                                parent: 'school',
                                type: 'display'
                            });
                        }
                    })
                );
            }

            // Handle Banner Image update: only delete old banner images if new ones are uploaded or explicitly deleted
            const hasNewBannerImage = Boolean(formData.bannerImageData?.values?.image && formData.bannerImageData.values.image.length > 0);
            const hasDeletedBannerImage = Boolean(deletedBannerImage && deletedBannerImage.length > 0);

            if (hasNewBannerImage || hasDeletedBannerImage) {
                await API.ImageAPI.deleteImage({
                    parent: "school",
                    parent_id: id,
                    type: "banner"
                });
            }

            if (hasNewBannerImage) {
                await Promise.all(
                    Array.from(formData.bannerImageData.values.image).map(async (image) => {
                        const formattedName = formatImageName(image.name);
                        const res = await API.ImageAPI.uploadImageToSupabase({
                            image: image,
                            folder: `school/${formattedName}`
                        });
                        if (res?.data?.status === "Success" || res?.data?.data) {
                            await API.ImageAPI.createImage({
                                image_src: res.data.data,
                                school_id: id,
                                parent_id: id,
                                parent: 'school',
                                type: 'banner'
                            });
                        }
                    })
                );
            }

            setLoading(false);
            setIsSubmitting(false);
            setSubmitted(false);
            toastAndNavigate(dispatch, true, "success", "Successfully Updated School Profile", navigateTo, '/school/listing');
        } catch (err) {
            setLoading(false);
            setIsSubmitting(false);
            setSubmitted(false);
            toastAndNavigate(dispatch, true, "error", err ? err?.response?.data?.msg : "An Error Occurred updating school", navigateTo, 0);
            console.error("Error in School Update", err);
        }
    }, [formData, id, deletedImage, deletedBannerImage]);

    const updateSchoolAndAddress = useCallback(async formData => {
        setIsSubmitting(true);
        setLoading(true);
        const paths = [];
        const dataFields = [];

        if (formData.schoolData.dirty) {
            paths.push("/update-school");
            dataFields.push({
                ...formData.schoolData.values,
                amenities: getIdsFromObject(formData.schoolData.values.amenities),
                payment_methods: getIdsFromObject(formData.schoolData.values.payment_methods)
            });
        }

        if (formData.addressData.dirty) {
            paths.push("/update-address");
            dataFields.push({ ...formData.addressData.values });
        }

        try {
            if (paths.length > 0) {
                await API.CommonAPI.multipleAPICall("PATCH", paths, dataFields);
            }
            await updateImageAndClassData(formData);
        } catch (err) {
            setLoading(false);
            setIsSubmitting(false);
            setSubmitted(false);
            toastAndNavigate(dispatch, true, "error", err ? err?.response?.data?.msg : "An Error Occurred", navigateTo, 0);
            throw err;
        }
    }, [formData, updateImageAndClassData]);

    const populateSchoolData = useCallback(id => {
        setIsPopulating(true);
        setLoading(true);
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
                        setUpdatedValues(dataObj);
                        setUpdatedDisplayImage(imagesList.filter(img => img.type === "display"));
                        setUpdatedBannerImage(imagesList.filter(img => img.type === "banner"));
                        setLoading(false);
                        setIsPopulating(false);
                    })
                    .catch(err => {
                        setLoading(false);
                        setIsPopulating(false);
                        toastAndNavigate(dispatch, true, "error", err?.response?.data?.msg || "Error fetching school classes", navigateTo, 0);
                    });
            })
            .catch(err => {
                setLoading(false);
                setIsPopulating(false);
                toastAndNavigate(dispatch, true, "error", err?.response?.data?.msg || "Error in MultipleApiCall", navigateTo, 0);
            });
    }, [formAmenitiesInRedux?.listData?.rows, allPaymentMethods?.listData?.length]);

    const createSchool = useCallback(async formData => {
        setIsSubmitting(true);
        setLoading(true);

        formData.schoolData.values = {
            ...formData.schoolData.values,
            school_code: createSchoolCode(formData.schoolData.values?.name),
            amenities: getIdsFromObject(formData.schoolData.values?.amenities),
            payment_methods: getIdsFromObject(formData.schoolData.values?.payment_methods)
        };

        try {
            const { data: school } = await API.SchoolAPI.createSchool({ ...formData.schoolData.values });
            if (school?.status === 'Success' && school?.data?.id) {
                const schoolId = school.data.id;

                const promise1 = API.AddressAPI.createAddress({
                    ...formData.addressData.values,
                    school_id: schoolId,
                    parent_id: schoolId,
                    parent: 'school'
                });

                const promise2 = formData.schoolData.values.sections?.length ? Promise.all(
                    formData.schoolData.values.sections.map(async (innerArray, classIndex) => {
                        const schoolClass = formData.schoolData.values.classes[classIndex] || 0;
                        const classFee = formData.schoolData.values.classes_fee[classIndex] || 0;
                        const classCapacity = formData.schoolData.values.classes_capacity[classIndex] || 0;
                        const classLateFee = formData.schoolData.values.classes_late_fee[classIndex] || 0;
                        const classLateFeeDuration = formData.schoolData.values.classes_late_fee_duration[classIndex] || 0;

                        return Promise.all(innerArray.map(async (sectionData, sectionIndex) => {
                            const subjectArray = formData.schoolData.values.subjects[classIndex] ? formData.schoolData.values.subjects[classIndex][sectionIndex] : [];
                            return API.SchoolAPI.insertIntoMappingTable(
                                [schoolId, schoolClass, sectionData.section_id || sectionData.id,
                                getIdsFromObject(subjectArray, allSubjects?.listData), classFee, classCapacity, classLateFee,
                                classLateFeeDuration]
                            );
                        }));
                    })
                ) : Promise.resolve();

                const promise3 = (formData.imageData.values?.image?.length) ? Promise.all(
                    Array.from(formData.imageData.values.image).map(async (image) => {
                        let formattedName = formatImageName(image.name);
                        return API.ImageAPI.uploadImageToSupabase({
                            image: image,
                            folder: `school/${formattedName}`,
                        })
                            .then(res => {
                                if (res?.data?.status === "Success" || res?.data?.data) {
                                    return API.ImageAPI.createImage({
                                        image_src: res.data.data,
                                        school_id: schoolId,
                                        parent_id: schoolId,
                                        parent: 'school',
                                        type: 'display'
                                    });
                                }
                            });
                    })
                ) : Promise.resolve();

                const promise4 = (formData.bannerImageData.values?.image?.length) ? Promise.all(
                    Array.from(formData.bannerImageData.values.image).map(async (image) => {
                        let formattedName = formatImageName(image.name);
                        return API.ImageAPI.uploadImageToSupabase({
                            image: image,
                            folder: `school/${formattedName}`,
                        })
                            .then(res => {
                                if (res?.data?.status === "Success" || res?.data?.data) {
                                    return API.ImageAPI.createImage({
                                        image_src: res.data.data,
                                        school_id: schoolId,
                                        parent_id: schoolId,
                                        parent: 'school',
                                        type: 'banner'
                                    });
                                }
                            });
                    })
                ) : Promise.resolve();

                await Promise.all([promise1, promise2, promise3, promise4]);
                setLoading(false);
                setIsSubmitting(false);
                setSubmitted(false);
                toastAndNavigate(dispatch, true, "success", "Successfully Registered School", navigateTo, '/school/listing');
            } else {
                throw new Error(school?.msg || "Failed to register school");
            }
        } catch (err) {
            setLoading(false);
            setIsSubmitting(false);
            setSubmitted(false);
            toastAndNavigate(dispatch, true, "error", err ? err?.response?.data?.msg || err?.message : "An Error Occurred", navigateTo, 0);
        }
    }, [formData]);

    useEffect(() => {
        if (!formAmenitiesInRedux?.listData?.rows?.length) {
            getPaginatedData(0, 50, setFormAmenities, API.AmenityAPI);
        }
    }, []);

    useEffect(() => {
        if (!allPaymentMethods?.listData?.length) {
            fetchAndSetAll(dispatch, setAllPaymentMethods, API.PaymentMethodAPI);
        }
    }, []);

    useEffect(() => {
        if (!allSubjects?.listData?.length) {
            fetchAndSetAll(dispatch, setAllSubjects, API.SubjectAPI);
        }
    }, []);

    useEffect(() => {
        if (!allClasses?.listData?.length) {
            fetchAndSetAll(dispatch, setAllClasses, API.ClassAPI);
        }
    }, []);

    useEffect(() => {
        if (!allSections?.listData?.length) {
            fetchAndSetAll(dispatch, setAllSections, API.SectionAPI);
        }
    }, []);

    // Create / Update / Populate School
    useEffect(() => {
        if (!isCreate && id && !submitted && formAmenitiesInRedux?.listData?.rows && allSubjects?.listData) {
            setTitle("Update");
            populateSchoolData(id);
        }
        if (submitted && formData.schoolData.validated && formData.addressData.validated && formData.imageData.validated && formData.bannerImageData.validated) {
            formData.schoolData.values?.id ? updateSchoolAndAddress(formData) : createSchool(formData);
        } else {
            setSubmitted(false);
        }
    }, [id, isCreate, submitted, formAmenitiesInRedux?.listData?.rows, allSubjects?.listData]);

    const handleSubmit = async () => {
        await schoolFormRef.current.Submit();
        await addressFormRef.current.Submit();
        await imageFormRef.current?.Submit();
        await bannerImageFormRef.current?.Submit();
        setSubmitted(true);
    };

    const handleFormChange = (data, form) => {
        if (form === 'school') {
            setFormData(prev => ({ ...prev, schoolData: data }));
        } else if (form === 'address') {
            setFormData(prev => ({ ...prev, addressData: data }));
        } else if (form === 'display') {
            setFormData(prev => ({ ...prev, imageData: data }));
        } else if (form === 'banner') {
            setFormData(prev => ({ ...prev, bannerImageData: data }));
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 flex items-start justify-center">
            <div 
                className="w-full max-w-7xl rounded-2xl border border-slate-200/90 dark:border-[#262626] overflow-hidden shadow-2xl relative bg-white dark:bg-[#101010]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.94)), url(${formBg?.src || formBg})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                    backgroundAttachment: "fixed"
                }}
            >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-slate-200/80 dark:border-[#222] bg-white/80 dark:bg-[#101010]/80 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                            title === "Update" 
                                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50" 
                                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50"
                        }`}>
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                {`${title} ${selected || "School"}`}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {title === "Update" 
                                    ? "Modify school profiles, classes, sections, fee structures, and media assets" 
                                    : "Register a new school branch with affiliated board, classes, fee structures, and media"}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigateTo("/school/listing")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2a2a2a] hover:bg-slate-50 dark:hover:bg-[#252525] rounded-xl transition-all cursor-pointer shadow-2xs"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to List
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <SchoolFormComponent
                        onChange={(data) => {
                            handleFormChange(data, 'school');
                        }}
                        refId={schoolFormRef}
                        setDirty={setDirty}
                        reset={reset}
                        setReset={setReset}
                        schoolId={id}
                        allClasses={allClasses?.listData}
                        allSections={allSections?.listData}
                        subjectsInRedux={allSubjects?.listData}
                        amenities={formAmenitiesInRedux?.listData?.rows}
                        paymentMethods={allPaymentMethods?.listData}
                        updatedValues={updatedValues?.schoolData}
                    />

                    <AddressFormComponent
                        onChange={(data) => {
                            handleFormChange(data, 'address');
                        }}
                        refId={addressFormRef}
                        update={Boolean(id)}
                        setDirty={setDirty}
                        reset={reset}
                        setReset={setReset}
                        updatedValues={updatedValues?.addressData}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white/95 dark:bg-[#161616]/90 border border-slate-200/90 dark:border-[#262626] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)] p-5 md:p-6 transition-all duration-200">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-[#222]">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Display Image
                                </h3>
                                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Official Logo / Picture</span>
                            </div>
                            <ImagePicker
                                key="image"
                                onChange={data => handleFormChange(data, 'display')}
                                refId={imageFormRef}
                                reset={reset}
                                setReset={setReset}
                                setDirty={setDirty}
                                preview={previewDisplay}
                                setPreview={setPreviewDisplay}
                                updatedImage={updatedDisplayImage}
                                setUpdatedImage={setUpdatedDisplayImage}
                                deletedImage={deletedImage}
                                setDeletedImage={setDeletedImage}
                                imageType="Display"
                                ENV={ENV}
                            />
                        </div>

                        <div className="bg-white/95 dark:bg-[#161616]/90 border border-slate-200/90 dark:border-[#262626] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)] p-5 md:p-6 transition-all duration-200">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-[#222]">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Banner Images
                                </h3>
                                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Campus & Facility Banners</span>
                            </div>
                            <ImagePicker
                                key="banner"
                                onChange={data => handleFormChange(data, 'banner')}
                                refId={bannerImageFormRef}
                                reset={reset}
                                setReset={setReset}
                                setDirty={setDirty}
                                preview={previewBanner}
                                setPreview={setPreviewBanner}
                                updatedImage={updatedBannerImage}
                                setUpdatedImage={setUpdatedBannerImage}
                                deletedImage={deletedBannerImage}
                                setDeletedImage={setDeletedBannerImage}
                                imageType="Banner"
                                multiple={true}
                                ENV={ENV}
                                validation={false}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200/80 dark:border-[#222] bg-white/80 dark:bg-[#101010]/80 backdrop-blur-md flex items-center justify-between gap-3">
                    <div>
                        {title !== "Update" && (
                            <button
                                type="reset"
                                disabled={!dirty || submitted || isSubmitting}
                                onClick={() => {
                                    if (window.confirm("Do you really want to reset this form?")) {
                                        setReset(true);
                                    }
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202020] rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset Form
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => navigateTo("/school/listing")}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2a2a2a] hover:bg-slate-50 dark:hover:bg-[#252525] rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={() => handleSubmit()}
                            disabled={!dirty || submitted || isSubmitting}
                            className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                title === "Update"
                                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 hover:shadow-blue-600/30"
                                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 hover:shadow-emerald-600/30"
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    <span>{title === "Update" ? "Updating School..." : "Saving School..."}</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>{title === "Update" ? "Update School" : "Save School"}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <Toast
                    alerting={toastInfo.toastAlert}
                    severity={toastInfo.toastSeverity}
                    message={toastInfo.toastMessage}
                />

                {isPopulating && (
                    <div className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Loader 
                            text="Loading School Details..."
                            subtext="Retrieving institutional records, class mappings, fee structures, and media assets"
                        />
                    </div>
                )}

                {isSubmitting && (
                    <div className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Loader 
                            text={title === "Update" ? "Updating School Profile..." : "Saving School Details..."}
                            subtext="Processing institutional registration, classes, sections, and media"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormComponent;
