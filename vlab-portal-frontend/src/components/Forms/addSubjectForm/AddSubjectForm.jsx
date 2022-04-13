import React from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";

import styled from "styled-components";


const AddSubjectForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm();
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
        placeholder="Subject Name"
        {...register("Subject Name", { required: true })}
      />
      <textarea
        placeholder="Subject Description"
        {...register("Subject Description", {})}
      />

      <p>
        Subject Enabled: Yes
        <input
          {...register("Subject Enabled", { required: true })}
          type="radio"
          value="Yes"
        />
        No
        <input
          {...register("Subject Enabled", { required: true })}
          type="radio"
          value="No"
        />
      </p>

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
export default AddSubjectForm;
