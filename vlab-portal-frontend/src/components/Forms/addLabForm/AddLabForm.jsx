import { validateYupSchema } from "formik";
import React from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { Paper, Box, Container } from "@mui/material"
import * as yup from "yup";
import styled from "styled-components";

const schema = yup.object().shape({
  labmanual: yup
    .mixed()
    .required("Upload a file please.")
    .test("type", "File needs to be in csv format", (value) => {
      return value && value[0].type === "text/csv";
    }),
});

const AddLabForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm({ validationSchema: schema });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });
  const onSubmit = (data) => console.log(data);
  console.log(errors);

  return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <input
          type="text"
          placeholder="Lab Name"
          {...register("labname", { required: true })}
        />
        <textarea
          placeholder="Lab Description"
          {...register("labdescription", {})}
        />

        <p>
          Subject Enabled: Yes
          <input
            {...register("labenabled", { required: true })}
            type="radio"
            value="Yes"
          />
          No
          <input
            {...register("labenabled", { required: true })}
            type="radio"
            value="No"
          />
        </p>
        <input
          {...register("labmanual", { required: true })}
          type="file"
          name="labmanual"
        />

        {fields.map(({ id }, index) => {
          return (
            <div key={id}>
              <select {...register(`items[${index}].type`)}>
                <option value="Docker">Docker</option>
                <option value="Visual Studio Code">Visual Studio Code</option>
                <option value="MySQL">MySQL</option>
              </select>
              <p>
                Application Enabled: Yes
                <input
                  {...register(`items[${index}].enabled`, { required: true })}
                  type="radio"
                  value="Yes"
                />
                No
                <input
                  {...register(`items[${index}].enabled`, { required: true })}
                  type="radio"
                  value="No"
                />
              </p>
              <button type="button" onClick={() => remove(index)}>
                Remove
              </button>
            </div>
          );
        })}
        <button type="button" onClick={() => append({})}>
          Append
        </button>

        <input type="submit" />
      </form>
  );
};
export default AddLabForm;
