package org.linkedgov.command;

import java.io.IOException;
import java.io.Serializable;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.JSONException;
import org.json.JSONWriter;

import com.google.refine.ProjectMetadata;
import com.google.refine.ProjectManager;
import com.google.refine.commands.Command;
import com.google.refine.model.Project;

public class GetMetaInformationCommand extends Command {
    @Override
    public void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        Project project = getProject(request);
		String rawKeysString = request.getParameter("keys");
		String[] keys = rawKeysString.split(",");
		       
        try {
            metadataJSON(response, ProjectManager.singleton.getProjectMetadata(project.id), keys);
        } catch (IOException e) {
            respondException(response, e);
        } catch (ServletException e) {
            respondException(response, e);
        }
    }


	private static void metadataJSON(HttpServletResponse response, ProjectMetadata metadata, String[] keys)
			throws ServletException, IOException {
		try {
			response.setCharacterEncoding("UTF-8");
            response.setHeader("Content-Type", "application/json");

			JSONWriter writer = new JSONWriter(response.getWriter());
			writer.object();
			writer.key("customMetadata");
			writer.object();
			
			for (int i = 0; i < keys.length; i++){
				String key = keys[i];		
				Serializable value = metadata.getCustomMetadata(key);
				if(value != null){
	                                writer.key(key);
	                                writer.value(value);				    
				}
			}
			writer.endObject();
			writer.endObject();
		} catch (JSONException e) {
			respondException(response, e);
		}		
	}
}
